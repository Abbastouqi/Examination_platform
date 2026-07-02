"""Resilient client for the LLM (OpenAI-compatible API).

Points the `openai` SDK at QWEN_BASE_URL (the university server) with an optional
fallback endpoint, a circuit breaker, and clean error handling so an LLM outage
or slowdown degrades gracefully (surfaced as 503) instead of hanging or 500-ing.
"""
import json
import time
from typing import AsyncIterator

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AsyncOpenAI,
    InternalServerError,
    NotFoundError,
    RateLimitError,
)
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings
from app.core.logging import logger


class LLMUnavailable(Exception):
    """The AI model backend is unreachable/failing. Mapped to HTTP 503."""


# --- Endpoints: primary + optional fallback --------------------------------
def _build_client(base_url: str, api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=base_url,
        api_key=api_key or "sk-no-key-required",
        timeout=settings.QWEN_TIMEOUT,
    )


_client = _build_client(settings.QWEN_BASE_URL, settings.QWEN_API_KEY)  # kept for back-compat
_ENDPOINTS: list[tuple[AsyncOpenAI, str]] = [(_client, settings.QWEN_MODEL)]
if settings.QWEN_FALLBACK_BASE_URL:
    _ENDPOINTS.append(
        (
            _build_client(settings.QWEN_FALLBACK_BASE_URL, settings.QWEN_FALLBACK_API_KEY),
            settings.QWEN_FALLBACK_MODEL or settings.QWEN_MODEL,
        )
    )

# Transient errors worth retrying / failing over.
_TRANSIENT = (APIConnectionError, APITimeoutError, RateLimitError, InternalServerError)

# --- Circuit breaker (per-process) -----------------------------------------
_cb = {"failures": 0, "open_until": 0.0}
_UNAVAILABLE_MSG = "The AI service is temporarily unavailable. Please try again in a moment."


def _cb_open() -> bool:
    return time.time() < _cb["open_until"]


def _cb_success() -> None:
    _cb["failures"] = 0
    _cb["open_until"] = 0.0


def _cb_failure() -> None:
    _cb["failures"] += 1
    if _cb["failures"] >= settings.QWEN_CB_THRESHOLD:
        _cb["open_until"] = time.time() + settings.QWEN_CB_COOLDOWN
        logger.warning(
            f"LLM circuit breaker OPEN for {settings.QWEN_CB_COOLDOWN}s "
            f"after {_cb['failures']} consecutive failures"
        )


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(min=1, max=6),
    retry=retry_if_exception_type(_TRANSIENT),
    reraise=True,
)
async def _create_once(client: AsyncOpenAI, model: str, messages, temperature, max_tokens):
    return await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=settings.QWEN_TEMPERATURE if temperature is None else temperature,
        max_tokens=max_tokens or settings.QWEN_MAX_TOKENS,
    )


async def chat(
    messages: list[dict],
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> str:
    """Blocking completion with fallback + circuit breaker. Raises LLMUnavailable."""
    if _cb_open():
        raise LLMUnavailable(_UNAVAILABLE_MSG)
    last: Exception | None = None
    for client, model in _ENDPOINTS:
        try:
            resp = await _create_once(client, model, messages, temperature, max_tokens)
            _cb_success()
            return resp.choices[0].message.content or ""
        except NotFoundError as e:  # model/endpoint gone — try next endpoint
            last = e
            logger.warning(f"LLM endpoint '{model}' returned 404; trying next endpoint")
        except (_TRANSIENT + (APIError,)) as e:
            last = e
            logger.warning(f"LLM endpoint '{model}' failed: {type(e).__name__}: {e}")
    _cb_failure()
    raise LLMUnavailable(_UNAVAILABLE_MSG) from last


async def chat_stream(
    messages: list[dict],
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    """Streaming completion yielding content deltas. Raises LLMUnavailable if no
    endpoint can start a stream; a mid-stream failure surfaces as LLMUnavailable."""
    if _cb_open():
        raise LLMUnavailable(_UNAVAILABLE_MSG)
    last: Exception | None = None
    for client, model in _ENDPOINTS:
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=settings.QWEN_TEMPERATURE if temperature is None else temperature,
                max_tokens=max_tokens or settings.QWEN_MAX_TOKENS,
                stream=True,
            )
        except NotFoundError as e:
            last = e
            logger.warning(f"LLM stream endpoint '{model}' 404; trying next endpoint")
            continue
        except (_TRANSIENT + (APIError,)) as e:
            last = e
            logger.warning(f"LLM stream endpoint '{model}' failed to start: {e}")
            continue

        _cb_success()
        try:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
            return
        except Exception as e:  # mid-stream failure — cannot fail over cleanly
            logger.warning(f"LLM stream interrupted mid-response: {e}")
            raise LLMUnavailable("The AI response was interrupted. Please try again.") from e

    _cb_failure()
    raise LLMUnavailable(_UNAVAILABLE_MSG) from last


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
