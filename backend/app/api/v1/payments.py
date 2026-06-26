"""Payment endpoints: initiate a subscription purchase, gateway callbacks,
and the user's payment history.

The /subscribe endpoint returns a redirect descriptor (gateway URL + form
params); the frontend renders a hidden auto-submitting HTML form so the
browser POSTs directly to the gateway's hosted checkout. The gateway then
POSTs its result back to the matching /callback/* endpoint, which finalises
the payment and 302-redirects the browser to a frontend billing page.
"""
from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, RedirectResponse

from app.api.deps import get_current_active_user
from app.db.mongo import get_db
from app.models.common import PaymentProvider
from app.schemas.payments import SubscribeRequest
from app.services import manual_payment_service, payment_service
from app.utils.serialize import serialize

router = APIRouter()


@router.get("/methods")
async def methods() -> dict:
    """Account details (JazzCash/Easypaisa) + purchasable plans for the UI."""
    return manual_payment_service.payment_methods()


@router.post("/manual")
async def submit_manual(
    plan: str = Form(...),
    provider: str = Form(...),
    sender_name: str = Form(...),
    sender_number: str = Form(""),
    transaction_ref: str = Form(""),
    proof: UploadFile = File(...),
    user: dict = Depends(get_current_active_user),
) -> dict:
    """Submit a manual payment with a proof screenshot (status: pending)."""
    return await manual_payment_service.submit_manual_payment(
        user=user,
        plan=plan,
        provider=provider,
        sender_name=sender_name,
        sender_number=sender_number,
        transaction_ref=transaction_ref,
        proof=proof,
    )


@router.get("/{payment_id}/proof")
async def proof(payment_id: str, user: dict = Depends(get_current_active_user)) -> FileResponse:
    """Serve a payment's proof image (owner or admin only)."""
    path = await manual_payment_service.get_proof_path(payment_id, user)
    return FileResponse(path)


@router.post("/subscribe")
async def subscribe(
    payload: SubscribeRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    """Create a pending payment and return the gateway redirect descriptor."""
    return await payment_service.create_payment(
        user_id=str(user["_id"]),
        plan=payload.plan.value,
        provider=payload.provider.value,
    )


@router.post("/callback/jazzcash")
async def jazzcash_callback(request: Request) -> RedirectResponse:
    """JazzCash return URL — receives ``pp_*`` fields as form data."""
    form = await request.form()
    data = {k: v for k, v in form.items()}
    result = await payment_service.handle_callback(PaymentProvider.JAZZCASH.value, data)
    return RedirectResponse(url=result["redirect"], status_code=303)


@router.post("/callback/easypaisa")
async def easypaisa_callback(request: Request) -> RedirectResponse:
    """Easypaisa post-back URL — receives result fields as form data."""
    form = await request.form()
    data = {k: v for k, v in form.items()}
    result = await payment_service.handle_callback(PaymentProvider.EASYPAISA.value, data)
    return RedirectResponse(url=result["redirect"], status_code=303)


@router.get("/history")
async def history(user: dict = Depends(get_current_active_user)) -> list[dict]:
    """The current user's payment history, newest first."""
    db = get_db()
    cursor = db.payments.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    return [serialize(doc) async for doc in cursor]
