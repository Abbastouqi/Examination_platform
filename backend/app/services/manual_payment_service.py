"""Manual payment flow: user transfers to our JazzCash/Easypaisa accounts,
uploads a proof screenshot, an admin reviews it, and on approval the user's
subscription is activated.

Payment records live in the `payments` collection with:
    method="manual", status in {pending, approved, rejected}, proof_file, ...
This is separate from the automated gateway flow in `payment_service.py`.
"""
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.logging import logger, write_system_log
from app.db.mongo import get_db
from app.models.common import PaymentProvider, utcnow
from app.services import subscription_service
from app.services.subscription_service import PLANS
from app.utils.serialize import oid, serialize

_ALLOWED_PROOF = {".png", ".jpg", ".jpeg", ".webp", ".pdf"}
PROOF_DIR = Path(settings.UPLOAD_DIR) / "payment_proofs"


def payment_methods() -> dict:
    """Account details + plan catalog shown on the billing page."""
    return {
        "account_name": settings.PAYMENT_ACCOUNT_NAME,
        "methods": [
            {
                "provider": PaymentProvider.JAZZCASH.value,
                "label": "JazzCash",
                "account_title": settings.PAYMENT_ACCOUNT_NAME,
                "number": settings.JAZZCASH_NUMBER,
                "iban": settings.JAZZCASH_IBAN,
                "instructions": "Send to the JazzCash number or IBAN above, then upload your screenshot.",
            },
            {
                "provider": PaymentProvider.EASYPAISA.value,
                "label": "Easypaisa",
                "account_title": settings.PAYMENT_ACCOUNT_NAME,
                "iban": settings.EASYPAISA_IBAN,
                "instructions": "Send to the Easypaisa IBAN above, then upload your screenshot.",
            },
        ],
        "plans": [p for p in subscription_service.list_plans() if p["id"] != "free"],
    }


async def submit_manual_payment(
    *,
    user: dict,
    plan: str,
    provider: str,
    sender_name: str,
    sender_number: str,
    transaction_ref: str,
    proof: UploadFile,
) -> dict:
    """Persist a pending manual payment + its proof file; notify the admin."""
    if plan not in PLANS or plan == "free":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid plan")
    if provider not in (PaymentProvider.JAZZCASH.value, PaymentProvider.EASYPAISA.value):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid provider")

    ext = Path(proof.filename or "").suffix.lower()
    if ext not in _ALLOWED_PROOF:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Proof must be one of {sorted(_ALLOWED_PROOF)}")

    contents = await proof.read()
    if len(contents) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Proof exceeds {settings.MAX_UPLOAD_MB}MB")

    db = get_db()
    now = utcnow()
    amount = PLANS[plan]["price"]
    payment = {
        "user_id": str(user["_id"]),
        "user_email": user.get("email"),
        "plan": plan,
        "amount": amount,
        "currency": "PKR",
        "provider": provider,
        "method": "manual",
        "status": "pending",  # pending | approved | rejected
        "sender_name": sender_name,
        "sender_number": sender_number,
        "transaction_ref": transaction_ref,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.payments.insert_one(payment)
    pid = res.inserted_id

    # Save the proof file as <payment_id><ext>.
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    proof_path = PROOF_DIR / f"{pid}{ext}"
    proof_path.write_bytes(contents)
    await db.payments.update_one({"_id": pid}, {"$set": {"proof_file": str(proof_path)}})

    await write_system_log(
        "INFO",
        f"New payment submitted: {user.get('email')} -> {plan} (PKR {amount}) via {provider}",
        source="payments",
        user_id=str(user["_id"]),
        meta={"payment_id": str(pid), "plan": plan, "amount": amount},
    )
    # Best-effort email to the admin (never blocks the request).
    try:
        from app.services.email import send_email

        await send_email(
            settings.ADMIN_EMAIL,
            "New payment awaiting approval",
            f"<p>{user.get('email')} submitted a <b>{plan}</b> payment (PKR {amount}) via {provider}.</p>"
            f"<p>Review it in the admin dashboard.</p>",
        )
    except Exception as exc:
        logger.warning(f"Admin payment notification email failed: {exc}")

    doc = await db.payments.find_one({"_id": pid})
    return serialize(doc)


async def approve_payment(payment_id: str) -> dict:
    """Approve a pending manual payment and activate the user's subscription."""
    db = get_db()
    payment = await db.payments.find_one({"_id": oid(payment_id)})
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    if payment.get("status") == "approved":
        return serialize(payment)

    now = utcnow()
    await db.payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {"status": "approved", "approved_at": now, "updated_at": now}},
    )
    sub = await subscription_service.activate_subscription(
        user_id=payment["user_id"],
        plan=payment["plan"],
        provider=payment.get("provider", "manual"),
        payment_id=str(payment["_id"]),
    )
    await write_system_log(
        "INFO",
        f"Payment approved: {payment.get('user_email')} -> {payment['plan']}",
        source="payments",
        meta={"payment_id": payment_id},
    )
    payment = await db.payments.find_one({"_id": payment["_id"]})
    return {"payment": serialize(payment), "subscription": sub}


async def reject_payment(payment_id: str, reason: str = "") -> dict:
    db = get_db()
    payment = await db.payments.find_one({"_id": oid(payment_id)})
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    now = utcnow()
    await db.payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {"status": "rejected", "reject_reason": reason, "updated_at": now}},
    )
    await write_system_log(
        "INFO",
        f"Payment rejected: {payment.get('user_email')} -> {payment['plan']}",
        source="payments",
        meta={"payment_id": payment_id, "reason": reason},
    )
    payment = await db.payments.find_one({"_id": payment["_id"]})
    return serialize(payment)


async def list_payments(status_filter: str | None = None, limit: int = 100) -> list[dict]:
    db = get_db()
    query: dict = {"method": "manual"}
    if status_filter:
        query["status"] = status_filter
    cursor = db.payments.find(query).sort("created_at", -1).limit(limit)
    return [serialize(doc) async for doc in cursor]


async def get_proof_path(payment_id: str, requester: dict) -> str:
    """Return the proof file path if the requester owns it or is an admin."""
    db = get_db()
    payment = await db.payments.find_one({"_id": oid(payment_id)})
    if not payment or not payment.get("proof_file"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proof not found")
    is_admin = requester.get("role") == "admin"
    if not is_admin and payment["user_id"] != str(requester["_id"]):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
    if not Path(payment["proof_file"]).exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proof file missing")
    return payment["proof_file"]
