"""Easypaisa (Telenor Microfinance) redirect/Hosted-Checkout integration.

Flow mirrors JazzCash: the backend builds a parameter dict including a
``merchantHashedReq`` signature; the frontend auto-submits an HTML form to
:data:`POST_URL`. Easypaisa renders its checkout page and posts the result
back to ``postBackURL`` where :func:`verify_callback` validates the status.

IMPORTANT — exact field names, the expiry-date format, and especially the
hashing scheme depend on the *specific merchant onboarding pack* Easypaisa
issues (older accounts use an AES-128 encryption of the request string with
the hash key; newer ones use an HMAC/SHA-256 digest). The implementation
below uses a deterministic HMAC-SHA256 best-effort signature so the code is
fully runnable; swap :func:`compute_hash` for the merchant's documented
algorithm at integration time (see the TODO marks).
"""
from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta

from app.core.config import settings

_SANDBOX_URL = "https://easypaystg.easypaisa.com.pk/easypay/Index.jsf"
_LIVE_URL = "https://easypay.easypaisa.com.pk/easypay/Index.jsf"

POST_URL = _LIVE_URL if settings.EASYPAISA_ENV.lower() in ("live", "production") else _SANDBOX_URL

# Easypaisa expiry format: yyyyMMdd HHmmss.
_DT_FORMAT = "%Y%m%d %H%M%S"
_EXPIRY = timedelta(days=1)

# Fields that take part in the request signature, in the canonical
# alphabetical order Easypaisa documents for the hashed-request string.
_HASH_FIELDS = ("amount", "orderRefNum", "paymentMethod", "postBackURL", "storeId")


def compute_hash(params: dict) -> str:
    """Produce the ``merchantHashedReq`` signature from the request params.

    Builds the canonical ``key=value&...`` string over :data:`_HASH_FIELDS`
    (sorted, non-empty) and signs it with EASYPAISA_HASH_KEY via HMAC-SHA256.

    TODO(merchant-spec): replace the body with the exact algorithm from your
    Easypaisa onboarding pack. Many accounts require AES-128-ECB encryption of
    the request string using the (base64) hash key, then base64 of the cipher
    text — NOT an HMAC. Keep the canonical string construction; change only the
    signing primitive to match the documented spec.
    """
    key = settings.EASYPAISA_HASH_KEY
    parts = [f"{f}={params[f]}" for f in _HASH_FIELDS if str(params.get(f, "")) != ""]
    message = "&".join(parts)
    return hmac.new(
        key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest().upper()


def build_payment_params(*, amount: float, order_ref: str, email: str) -> dict:
    """Build the Easypaisa checkout parameter dict.

    ``amount`` is in PKR. ``datetime.now`` is used to stamp the expiry; this
    runs server-side at request time.
    """
    now = datetime.now()
    params: dict = {
        "storeId": settings.EASYPAISA_STORE_ID,
        # Easypaisa expects a decimal amount string with two places.
        "amount": f"{float(amount):.1f}",
        "postBackURL": settings.EASYPAISA_RETURN_URL,
        "orderRefNum": order_ref,
        "expiryDate": (now + _EXPIRY).strftime(_DT_FORMAT),
        # MA_PAYMENT_METHOD = mobile-account wallet flow.
        "paymentMethod": "MA_PAYMENT_METHOD",
        "emailAddr": email,
    }
    params["merchantHashedReq"] = compute_hash(params)
    return params


def verify_callback(data: dict) -> bool:
    """Validate an Easypaisa return payload.

    Easypaisa signals success through a status/response code on the post-back.
    A successful transaction reports response code ``0000`` (and/or a status
    of ``PAID``/``SUCCESS``). Accept any of these to stay tolerant across the
    several post-back shapes different merchant accounts receive.

    TODO(merchant-spec): if your account returns a signed post-back, also
    recompute and constant-time-compare the response signature here.
    """
    code = str(data.get("responseCode") or data.get("status") or "").upper()
    return code in {"0000", "PAID", "SUCCESS", "COMPLETED"}
