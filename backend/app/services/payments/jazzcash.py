"""JazzCash Hosted Checkout / Page-Redirection integration.

Flow: the backend builds a set of ``pp_*`` parameters (including a
``pp_SecureHash``) and returns them to the frontend, which auto-submits an
HTML form (``method=POST``) to :data:`POST_URL`. JazzCash hosts the wallet
checkout page and, when done, POSTs the same ``pp_*`` fields back to our
``pp_ReturnURL`` where :func:`verify_callback` validates them.

IMPORTANT — real merchant credentials are required for live transactions.
Set JAZZCASH_MERCHANT_ID / JAZZCASH_PASSWORD / JAZZCASH_INTEGRITY_SALT /
JAZZCASH_RETURN_URL and JAZZCASH_ENV ("sandbox" | "live") in the environment.
With empty credentials the params/hash are still produced deterministically
(useful for tests) but the gateway will reject them.
"""
from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta

from app.core.config import settings

# JazzCash exposes distinct endpoints for the sandbox vs production gateway.
# The path is identical; only the host differs by environment.
_SANDBOX_URL = "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
_LIVE_URL = "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"

POST_URL = _LIVE_URL if settings.JAZZCASH_ENV.lower() in ("live", "production") else _SANDBOX_URL

# Timestamp format JazzCash expects: yyyyMMddHHmmss.
_DT_FORMAT = "%Y%m%d%H%M%S"
# How long a generated transaction stays valid before the gateway expires it.
_EXPIRY = timedelta(days=1)


def _secure_hash(params: dict) -> str:
    """Compute ``pp_SecureHash`` per the JazzCash spec.

    The hash is an HMAC-SHA256 (keyed with the Integrity Salt) over the
    non-empty ``pp_*`` values, sorted by key and joined with ``&``, with the
    integrity salt prepended as the first element of that string.

        salt&value1&value2&...   (values ordered by their parameter name)
    """
    salt = settings.JAZZCASH_INTEGRITY_SALT
    # Only pp_* fields participate; pp_SecureHash itself is excluded.
    ordered_keys = sorted(k for k in params if k.startswith("pp_") and k != "pp_SecureHash")
    values = [str(params[k]) for k in ordered_keys if str(params.get(k, "")) != ""]
    message = "&".join([salt, *values])
    return hmac.new(
        salt.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest().upper()


def build_payment_params(*, amount: float, txn_ref: str, description: str) -> dict:
    """Build the full ``pp_*`` parameter dict (including ``pp_SecureHash``).

    ``amount`` is in PKR (rupees); JazzCash requires the amount in **paisa**,
    so it is multiplied by 100. ``datetime.now`` is used intentionally — this
    runs server-side at request time to stamp the transaction.
    """
    now = datetime.now()
    params: dict = {
        "pp_Version": "1.1",
        "pp_TxnType": "MWALLET",
        "pp_Language": "EN",
        "pp_MerchantID": settings.JAZZCASH_MERCHANT_ID,
        "pp_Password": settings.JAZZCASH_PASSWORD,
        "pp_TxnRefNo": txn_ref,
        # Amount must be an integer string in paisa.
        "pp_Amount": str(int(round(amount * 100))),
        "pp_TxnCurrency": "PKR",
        "pp_TxnDateTime": now.strftime(_DT_FORMAT),
        "pp_BillReference": txn_ref,
        "pp_Description": description,
        "pp_ReturnURL": settings.JAZZCASH_RETURN_URL,
        "pp_TxnExpiryDateTime": (now + _EXPIRY).strftime(_DT_FORMAT),
        # These are part of the v1.1 form contract; left blank when unused.
        "pp_SubMerchantID": "",
        "pp_BankID": "",
        "pp_ProductID": "",
        "ppmpf_1": "",
        "ppmpf_2": "",
        "ppmpf_3": "",
        "ppmpf_4": "",
        "ppmpf_5": "",
    }
    params["pp_SecureHash"] = _secure_hash(params)
    return params


def verify_callback(data: dict) -> bool:
    """Validate a JazzCash return/IPN payload.

    Recomputes the secure hash from the returned ``pp_*`` fields and compares
    it (constant-time) to the gateway-supplied ``pp_SecureHash``. Success also
    requires ``pp_ResponseCode == "000"``.
    """
    received_hash = str(data.get("pp_SecureHash", "")).upper()
    if not received_hash:
        return False
    expected = _secure_hash(data)
    if not hmac.compare_digest(received_hash, expected):
        return False
    return str(data.get("pp_ResponseCode", "")) == "000"
