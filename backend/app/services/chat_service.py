"""Chat assistant service: conversation CRUD + RAG-grounded streaming replies.

Conversations live in the `chats` collection. Each holds an ordered list of
{role, content, created_at} messages. Replies are grounded with retrieved
context (RAG) using the user's latest message as the query.
"""
from typing import AsyncIterator

from fastapi import HTTPException, status

from app.db.mongo import get_db
from app.models.common import utcnow
from app.services import prompts, qwen_client
from app.services.rag import retrieve_context
from app.utils.serialize import oid, serialize

# Keep the prompt window bounded so we don't blow the context budget.
_HISTORY_CAP = 20


async def list_conversations(user_id: str) -> list:
    """Return the user's conversations (metadata only, newest first)."""
    cursor = (
        get_db()
        .chats.find(
            {"user_id": user_id},
            {"title": 1, "updated_at": 1, "created_at": 1},
        )
        .sort("updated_at", -1)
    )
    return [serialize(doc) async for doc in cursor]


async def create_conversation(user_id: str, title: str = "New chat") -> dict:
    """Create an empty conversation and return it."""
    now = utcnow()
    doc = {
        "user_id": user_id,
        "title": title or "New chat",
        "messages": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await get_db().chats.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


async def _owned_chat(user_id: str, chat_id: str) -> dict:
    try:
        cid = oid(chat_id)
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    chat = await get_db().chats.find_one({"_id": cid, "user_id": user_id})
    if not chat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    return chat


async def get_conversation(user_id: str, chat_id: str) -> dict:
    """Return the full conversation (including messages); 404 if not owned."""
    chat = await _owned_chat(user_id, chat_id)
    return serialize(chat)


async def delete_conversation(user_id: str, chat_id: str) -> None:
    await _owned_chat(user_id, chat_id)
    await get_db().chats.delete_one({"_id": oid(chat_id), "user_id": user_id})


async def rename_conversation(user_id: str, chat_id: str, title: str) -> dict:
    await _owned_chat(user_id, chat_id)
    await get_db().chats.update_one(
        {"_id": oid(chat_id), "user_id": user_id},
        {"$set": {"title": title, "updated_at": utcnow()}},
    )
    return await get_conversation(user_id, chat_id)


async def build_messages(
    user_id: str, chat_id: str, user_message: str, use_rag: bool = True
) -> list[dict]:
    """Assemble the message list sent to the model.

    [system_prompt(context), *recent_history, {user_message}]
    """
    chat = await _owned_chat(user_id, chat_id)

    context = ""
    if use_rag and user_message.strip():
        context, _ = await retrieve_context(user_message)

    history = chat.get("messages", [])[-_HISTORY_CAP:]
    history_msgs = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]

    return [
        prompts.chat_system_prompt(context=context),
        *history_msgs,
        {"role": "user", "content": user_message},
    ]


def _auto_title(message: str) -> str:
    title = " ".join(message.strip().split())
    if len(title) > 60:
        title = title[:57].rstrip() + "..."
    return title or "New chat"


async def _persist_user_message(user_id: str, chat_id: str, user_message: str) -> None:
    """Append the user message and auto-title the chat if still default."""
    db = get_db()
    chat = await _owned_chat(user_id, chat_id)
    now = utcnow()
    update: dict = {
        "$push": {"messages": {"role": "user", "content": user_message, "created_at": now}},
        "$set": {"updated_at": now},
    }
    if chat.get("title", "New chat") == "New chat":
        update["$set"]["title"] = _auto_title(user_message)
    await db.chats.update_one({"_id": oid(chat_id), "user_id": user_id}, update)


async def _persist_assistant_message(user_id: str, chat_id: str, content: str) -> None:
    now = utcnow()
    await get_db().chats.update_one(
        {"_id": oid(chat_id), "user_id": user_id},
        {
            "$push": {"messages": {"role": "assistant", "content": content, "created_at": now}},
            "$set": {"updated_at": now},
        },
    )


async def stream_reply(
    user_id: str, chat_id: str, user_message: str, use_rag: bool = True
) -> AsyncIterator[str]:
    """Persist the user message, then stream assistant deltas while accumulating.

    The full assistant reply is persisted once the stream completes.
    """
    # Build the prompt from history BEFORE appending the new user message,
    # since build_messages adds the user_message itself.
    messages = await build_messages(user_id, chat_id, user_message, use_rag=use_rag)
    await _persist_user_message(user_id, chat_id, user_message)

    parts: list[str] = []
    async for delta in qwen_client.chat_stream(messages):
        parts.append(delta)
        yield delta

    await _persist_assistant_message(user_id, chat_id, "".join(parts))


async def complete_reply(
    user_id: str, chat_id: str, user_message: str, use_rag: bool = True
) -> str:
    """Non-streaming variant: returns the full assistant text and persists both messages."""
    messages = await build_messages(user_id, chat_id, user_message, use_rag=use_rag)
    await _persist_user_message(user_id, chat_id, user_message)

    reply = await qwen_client.chat(messages)
    await _persist_assistant_message(user_id, chat_id, reply)
    return reply
