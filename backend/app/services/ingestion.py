"""Document ingestion: extract text from PDF/DOCX/TXT, chunk, embed, index in Qdrant."""
from pathlib import Path

from app.core.logging import logger
from app.services import vectorstore
from app.services.embeddings import embed_texts


def extract_text(file_path: str) -> str:
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(file_path)
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    if suffix in (".docx", ".doc"):
        import docx

        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    if suffix in (".txt", ".md"):
        return path.read_text(encoding="utf-8", errors="ignore")
    raise ValueError(f"Unsupported file type: {suffix}")


def chunk_text(text: str, *, chunk_size: int = 900, overlap: int = 150) -> list[str]:
    """Word-based chunking with overlap to preserve context across boundaries."""
    words = text.split()
    if not words:
        return []
    chunks, start = [], 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


async def ingest_document(
    *,
    file_path: str,
    doc_id: str,
    source: str,
    kind: str,
    test_type: str | None = None,
    subject_id: str | None = None,
    topic_id: str | None = None,
) -> int:
    """Full pipeline for one document. Returns number of chunks indexed."""
    await vectorstore.ensure_collection()
    text = extract_text(file_path)
    chunks = chunk_text(text)
    if not chunks:
        logger.warning(f"No text extracted from {source}")
        return 0

    vectors = embed_texts(chunks)
    payloads = [
        {
            "text": chunk,
            "source": source,
            "kind": kind,
            "test_type": test_type,
            "subject_id": subject_id,
            "topic_id": topic_id,
            "doc_id": doc_id,
            "chunk_index": i,
        }
        for i, chunk in enumerate(chunks)
    ]
    await vectorstore.upsert(vectors, payloads)
    logger.info(f"Indexed {len(chunks)} chunks from {source}")
    return len(chunks)
