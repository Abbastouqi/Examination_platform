"""Payment orchestration across JazzCash and Easypaisa.

`create_payment` records a pending payment and produces the redirect payload
(gateway URL + form params) the frontend auto-submits. `handle_callback`
verifies the gateway's return, finalises the payment, and — on success —
activates the matching subscription.
"""
from __future__ import annotations

import secrets
from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import write_system_log
from app.db.mongo import get_db
from app.models.common import PaymentProvider, PaymentStatus, utcnow
from app.services import subscription_service
from app.services.payments import easypaisa, jazzcash
from app.utils.serialize import serialize

# Map a provider value to its integration module.
_PROVIDERS = {
    PaymentProvider.JAZZCASH.value: jazzcash,
    PaymentProvider.EASYPAISA.value: easypaisa,
}


def _gen_txn_ref() -> str:
    """Generate a unique, gateway-safe transaction reference.

    Format: ``PG`` + 14-digit timestamp + 4 hex chars (alphanumeric only,
    which both gateways accept for their reference fields)."""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"PG{ts}{secrets.token_hex(2).upper()}"


async def create_payment(user_id: str, plan: str, provider: str) -> dict[str, Any]:
    """Validate the plan, create a pending payment, and build the redirect.

    Returns ``{"payment": <serialized>, "redirect": {"url", "method", "params"}}``.
    """
    plan_def = subscription_service.PLANS.get(plan)
    if plan_def is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown plan '{plan}'")
    if plan_def["price"] <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The free plan does not require payment")

    module = _PROVIDERS.get(provider)
    if module is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported provider '{provider}'")

    db = get_db()
    amount = plan_def["price"]
    txn_ref = _gen_txn_ref()

    # Build provider-specific gateway params.
    if provider == PaymentProvider.JAZZCASH.value:
        params = module.build_payment_params(
            amount=amount,
            txn_ref=txn_ref,
            description=f"{plan_def['name']} subscription",
        )
    else:  # easypaisa
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        email = (user or {}).get("email", "")
        params = module.build_payment_params(amount=amount, order_ref=txn_ref, email=email)

    now = utcnow()
    payment_doc = {
        "user_id": str(user_id),
        "plan": plan,
        "amount": amount,
        "currency": "PKR",
        "provider": provider,
        "provider_ref": txn_ref,
        "status": PaymentStatus.PENDING.value,
        "raw_request": params,
        "raw_response": None,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.payments.insert_one(payment_doc)
    payment_doc["_id"] = res.inserted_id

    await write_system_log(
        "INFO",
        f"Payment initiated: {provider} {txn_ref} for plan {plan}",
        source="payments",
        user_id=str(user_id),
        meta={"txn_ref": txn_ref, "amount": amount, "provider": provider},
    )

    return {
        "payment": serialize(payment_doc),
        "redirect": {
            "url": module.POST_URL,
            "method": "POST",
            "params": params,
        },
    }


def _success_redirect() -> str:
    return f"{settings.FRONTEND_URL}/billing/success"


def _failure_redirect() -> str:
    return f"{settings.FRONTEND_URL}/billing/failed"


async def handle_callback(provider: str, data: dict) -> dict[str, Any]:
    """Process a gateway return: verify, finalise payment, activate sub.

    Returns ``{"status", "payment_id"?, "redirect"}`` where ``redirect`` is a
    frontend billing-result URL the caller can 302 the browser to.
    """
    module = _PROVIDERS.get(provider)
    if module is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported provider '{provider}'")

    db = get_db()

    # Locate the originating payment by its transaction reference. The field
    # name differs per gateway, so check the documented candidates.
    txn_ref = (
        data.get("pp_TxnRefNo")
        or data.get("orderRefNum")
        or data.get("orderRefNumber")
        or data.get("pp_BillReference")
    )
    payment = await db.payments.find_one({"provider_ref": txn_ref}) if txn_ref else None
    if not payment:
        await write_system_log(
            "WARNING",
            f"Payment callback for unknown txn_ref: {txn_ref} ({provider})",
            source="payments",
            meta={"data": data},
        )
        return {"status": "not_found", "redirect": _failure_redirect()}

    # Idempotency: ignore callbacks for an already-finalised payment.
    if payment["status"] != PaymentStatus.PENDING.value:
        redirect = (
            _success_redirect()
            if payment["status"] == PaymentStatus.SUCCESS.value
            else _failure_redirect()
        )
        return {"status": payment["status"], "payment_id": str(payment["_id"]), "redirect": redirect}

    verified = module.verify_callback(data)
    now = utcnow()
    new_status = PaymentStatus.SUCCESS.value if verified else PaymentStatus.FAILED.value

    await db.payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {"status": new_status, "raw_response": data, "updated_at": now}},
    )

    if not verified:
        await write_system_log(
            "WARNING",
            f"Payment failed/unverified: {provider} {txn_ref}",
            source="payments",
            user_id=payment.get("user_id"),
            meta={"txn_ref": txn_ref},
        )
        return {"status": new_status, "payment_id": str(payment["_id"]), "redirect": _failure_redirect()}

    # Success: activate the subscription and link it back to the payment.
    sub = await subscription_service.activate_subscription(
        user_id=payment["user_id"],
        plan=payment["plan"],
        provider=provider,
        payment_id=str(payment["_id"]),
    )
    await db.payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {"subscription_id": sub.get("id"), "updated_at": now}},
    )

    await write_system_log(
        "INFO",
        f"Payment success: {provider} {txn_ref}, plan {payment['plan']} activated",
        source="payments",
        user_id=payment.get("user_id"),
        meta={"txn_ref": txn_ref, "subscription_id": sub.get("id")},
    )

    return {
        "status": new_status,
        "payment_id": str(payment["_id"]),
        "subscription": sub,
        "redirect": _success_redirect(),
    }
