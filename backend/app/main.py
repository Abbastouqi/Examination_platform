"""PrepGenius FastAPI application entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import configure_logging, logger
from app.db.mongo import close_mongo_connection, connect_to_mongo
from app.services.qwen_client import LLMUnavailable
from app.api.v1 import (
    admin,
    analytics,
    apikeys,
    auth,
    chat,
    css,
    documents,
    mcq,
    payments,
    public_api,
    subscriptions,
    tests,
    trial,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()

    # Production config guard — loudly refuse to run with insecure defaults.
    if settings.is_production:
        problems = []
        if settings.SECRET_KEY in ("change-me", "replace-me-with-a-64-char-random-string"):
            problems.append("SECRET_KEY is a default value")
        if settings.ADMIN_PASSWORD == "ChangeMe123!":
            problems.append("ADMIN_PASSWORD is the default value")
        if problems:
            logger.critical(
                "INSECURE PRODUCTION CONFIG: " + "; ".join(problems)
                + " — set strong values in the environment before serving traffic."
            )

    await connect_to_mongo()
    try:
        from app.services import vectorstore

        await vectorstore.ensure_collection()
    except Exception as exc:  # Qdrant may warm up slower than the API
        logger.warning(f"Qdrant collection init deferred: {exc}")

    # Warm the embedding model in a background thread so the API is responsive
    # immediately while the (~2.2GB, first-run) bge-m3 download/load happens.
    import asyncio

    from app.services.embeddings import warm_model

    asyncio.create_task(asyncio.to_thread(warm_model))

    logger.info(f"{settings.PROJECT_NAME} started ({settings.ENVIRONMENT})")
    yield
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AI-powered exam preparation platform for Pakistani competitive examinations.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Attach baseline security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(LLMUnavailable)
async def _llm_unavailable_handler(request: Request, exc: LLMUnavailable):
    """Map AI-backend outages to a clean 503 with a friendly message."""
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": str(exc) or "The AI service is temporarily unavailable."},
    )


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": settings.PROJECT_NAME, "env": settings.ENVIRONMENT}


P = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=f"{P}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{P}/users", tags=["users"])
app.include_router(mcq.router, prefix=f"{P}/mcq", tags=["mcq"])
app.include_router(tests.router, prefix=f"{P}/tests", tags=["tests"])
app.include_router(chat.router, prefix=f"{P}/chat", tags=["chat"])
app.include_router(documents.router, prefix=f"{P}/documents", tags=["documents"])
app.include_router(analytics.router, prefix=f"{P}/analytics", tags=["analytics"])
app.include_router(subscriptions.router, prefix=f"{P}/subscriptions", tags=["subscriptions"])
app.include_router(payments.router, prefix=f"{P}/payments", tags=["payments"])
app.include_router(apikeys.router, prefix=f"{P}/api-keys", tags=["api-keys"])
app.include_router(admin.router, prefix=f"{P}/admin", tags=["admin"])
app.include_router(public_api.router, prefix=f"{P}/public", tags=["public-api"])
app.include_router(css.router, prefix=f"{P}/css", tags=["css"])
app.include_router(trial.router, prefix=f"{P}/trial", tags=["trial"])
