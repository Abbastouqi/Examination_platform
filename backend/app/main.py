"""PrepGenius FastAPI application entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging, logger
from app.db.mongo import close_mongo_connection, connect_to_mongo
from app.api.v1 import (
    admin,
    analytics,
    apikeys,
    auth,
    chat,
    documents,
    mcq,
    payments,
    public_api,
    subscriptions,
    tests,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
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
