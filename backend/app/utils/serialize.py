"""Helpers for converting between Mongo documents and JSON-safe dicts."""
from typing import Any

from bson import ObjectId


def oid(value: str | ObjectId) -> ObjectId:
    """Coerce a string id to ObjectId (pass-through if already one)."""
    return value if isinstance(value, ObjectId) else ObjectId(value)


def serialize(doc: Any) -> Any:
    """Recursively convert ObjectId -> str and `_id` -> `id` for API output."""
    if doc is None:
        return None
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, list):
        return [serialize(d) for d in doc]
    if isinstance(doc, dict):
        out = {}
        for k, v in doc.items():
            key = "id" if k == "_id" else k
            out[key] = serialize(v)
        return out
    return doc
