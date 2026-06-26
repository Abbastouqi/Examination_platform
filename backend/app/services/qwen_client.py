"""Client for the locally-hosted Qwen model (OpenAI-compatible API).

The university server exposes an OpenAI-compatible `/v1` endpoint, so we use the
`openai` SDK pointed at QWEN_BASE_URL. Supports both blocking and streaming
completions plus a JSON-mode helper used by the MCQ/test generators.
"""
import json
from typing import AsyncIterator

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import logger

_client = AsyncOpenAI(
    base_url=settings.QWEN_BASE_URL,
    api_key=settings.QWEN_API_KEY or "sk-no-key-required",
    timeout=settings.QWEN_TIMEOUT,
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10), reraise=True)
async def chat(
    messages: list[dict],
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> str:
    """Single blocking completion. Returns the assistant message content."""
    resp = await _client.chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=messages,
        temperature=settings.QWEN_TEMPERATURE if temperature is None else temperature,
        max_tokens=max_tokens or settings.QWEN_MAX_TOKENS,
    )
    return resp.choices[0].message.content or ""


async def chat_stream(
    messages: list[dict],
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    """Streaming completion yielding content deltas (for the chat UI)."""
    stream = await _client.chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=messages,
        temperature=settings.QWEN_TEMPERATURE if temperature is None else temperature,
        max_tokens=max_tokens or settings.QWEN_MAX_TOKENS,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def chat_json(messages: list[dict], *, max_tokens: int | None = None) -> dict | list:
    """Completion that must return valid JSON. Robust to code-fence wrapping."""
    content = await chat(messages, temperature=0.3, max_tokens=max_tokens)
    return _parse_json(content)


def _parse_json(content: str):
    text = content.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if text.count("```") >= 2 else text.lstrip("`")
        text = text.removeprefix("json").strip()
        if text.endswith("```"):
            text = text[: -3].strip()

    # 1. Clean single JSON value (proper array or object).
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Some models emit multiple JSON objects back-to-back / newline-separated
    #    (e.g. one {…} per MCQ) instead of a single array. Decode them all.
    values = _extract_json_values(text)
    if values:
        return values if len(values) > 1 else values[0]

    # 3. Last resort: grab the outermost array span.
    start, end = text.find("["), text.rfind("]")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    logger.error(f"Qwen returned non-JSON content: {content[:300]}")
    raise ValueError("Model did not return valid JSON")


def _extract_json_values(text: str) -> list:
    """Extract every top-level JSON value from a string of concatenated values.

    Handles objects/arrays separated by whitespace, newlines, or commas. If any
    extracted value is itself a list, it is flattened so the caller always gets
    a flat list of items (e.g. MCQ objects)."""
    decoder = json.JSONDecoder()
    values: list = []
    idx, n = 0, len(text)
    while idx < n:
        while idx < n and text[idx] in " \t\r\n,":
            idx += 1
        if idx >= n:
            break
        try:
            val, end = decoder.raw_decode(text, idx)
            values.append(val)
            idx = end
        except json.JSONDecodeError:
            idx += 1  # skip stray char and keep scanning
    flat: list = []
    for v in values:
        flat.extend(v) if isinstance(v, list) else flat.append(v)
    return flat
