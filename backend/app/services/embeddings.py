"""Local multilingual embeddings via sentence-transformers.

The model is lazily loaded exactly once per process, guarded by a lock so a
background warm-up and a concurrent request can't both trigger a download.
"""
import threading

from app.core.config import settings
from app.core.logging import logger

_model_instance = None
_load_lock = threading.Lock()


def _model():
    """Return the singleton model, loading (and downloading on first run) once.

    Double-checked locking ensures only ONE thread performs the load even if a
    request arrives while the startup warm-up is still downloading.
    """
    global _model_instance
    if _model_instance is None:
        with _load_lock:
            if _model_instance is None:
                from sentence_transformers import SentenceTransformer

                logger.info(
                    f"Loading embedding model {settings.EMBEDDING_MODEL} on {settings.EMBEDDING_DEVICE}"
                )
                _model_instance = SentenceTransformer(
                    settings.EMBEDDING_MODEL, device=settings.EMBEDDING_DEVICE
                )
    return _model_instance


def warm_model() -> None:
    """Force the embedding model to load (downloads on first run)."""
    _model()
    logger.info("Embedding model warm and ready")


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    vectors = _model().encode(
        texts,
        normalize_embeddings=True,       # cosine similarity in Qdrant
        convert_to_numpy=True,
        show_progress_bar=False,
        batch_size=32,
    )
    return vectors.tolist()


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
