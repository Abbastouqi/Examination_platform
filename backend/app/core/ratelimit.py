"""Lightweight Redis-backed rate limiting.

Provides a FastAPI dependency factory `rate_limit(...)` that throttles requests
by client IP (and an optional bucket name). Fails OPEN if Redis is unavailable
so a Redis blip never takes the API down — abuse protection, not correctness.
"""
from __future__ import annotations

import time

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.logging import logger

_redis = None


def _client():
    """Lazily create a shared async Redis client."""
    global _redis
    if _redis is None:
        import redis.asyncio as aioredis

        _redis = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    return _redis


def _client_ip(request: Request) -> str:
    # Honour the first X-Forwarded-For hop when behind the nginx reverse proxy.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, limit: int, window_seconds: int):
    """Return a dependency that allows `limit` requests per `window_seconds`
    per client IP for the named `bucket`."""

    async def _dep(request: Request) -> None:
        ip = _client_ip(request)
        key = f"rl:{bucket}:{ip}:{int(time.time()) // window_seconds}"
        try:
            r = _client()
            current = await r.incr(key)
            if current == 1:
                await r.expire(key, window_seconds)
            if current > limit:
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please slow down and try again shortly.",
                )
        except HTTPException:
            raise
        except Exception as exc:  # never let a Redis issue break the endpoint
            logger.warning(f"Rate limiter unavailable ({bucket}): {exc}")

    return _dep
