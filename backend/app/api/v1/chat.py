"""Chat assistant endpoints: conversation CRUD + (streaming) AI replies."""
import json

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_active_user
from app.schemas.chat import CreateChatRequest, RenameChatRequest, SendMessageRequest
from app.services import chat_service
from app.services.quota import check_and_consume

router = APIRouter()


@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_active_user)) -> list:
    return await chat_service.list_conversations(str(user["_id"]))


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: CreateChatRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    return await chat_service.create_conversation(
        str(user["_id"]), title=payload.title or "New chat"
    )


@router.get("/conversations/{chat_id}")
async def get_conversation(
    chat_id: str, user: dict = Depends(get_current_active_user)
) -> dict:
    return await chat_service.get_conversation(str(user["_id"]), chat_id)


@router.patch("/conversations/{chat_id}")
async def rename_conversation(
    chat_id: str,
    payload: RenameChatRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    return await chat_service.rename_conversation(str(user["_id"]), chat_id, payload.title)


@router.delete("/conversations/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    chat_id: str, user: dict = Depends(get_current_active_user)
) -> None:
    await chat_service.delete_conversation(str(user["_id"]), chat_id)


@router.post("/message")
async def send_message(
    payload: SendMessageRequest,
    user: dict = Depends(get_current_active_user),
):
    uid = str(user["_id"])
    await check_and_consume(uid, "chat")

    # Create a conversation on the fly when none was supplied.
    chat_id = payload.chat_id
    if not chat_id:
        convo = await chat_service.create_conversation(uid)
        chat_id = convo["id"]

    if payload.stream:

        async def event_generator():
            async for delta in chat_service.stream_reply(
                uid, chat_id, payload.message, use_rag=payload.use_rag
            ):
                yield f"data: {json.dumps({'delta': delta})}\n\n"
            yield f"data: {json.dumps({'done': True, 'chat_id': chat_id})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    reply = await chat_service.complete_reply(
        uid, chat_id, payload.message, use_rag=payload.use_rag
    )
    return {"chat_id": chat_id, "reply": reply}
