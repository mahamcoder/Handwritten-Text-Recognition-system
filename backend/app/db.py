import logging
import uuid
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import firestore

import json
import os

logger = logging.getLogger(__name__)

# Fallback persistent document store when Firestore service account is not configured locally
LOCAL_STORE_PATH = os.path.join(os.path.dirname(__file__), "local_storage.json")

def _load_storage() -> dict[str, dict]:
    if os.path.exists(LOCAL_STORE_PATH):
        try:
            with open(LOCAL_STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load local storage file: {e}")
    return {}

def _save_storage(data: dict):
    try:
        serializable = {}
        for k, v in data.items():
            item = dict(v)
            for ts_field in ("upload_date", "updated_at"):
                val = item.get(ts_field)
                if val and hasattr(val, "isoformat"):
                    item[ts_field] = val.isoformat()
            serializable[k] = item
        with open(LOCAL_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2, default=str)
    except Exception as e:
        logger.warning(f"Could not persist local storage file: {e}")

MEMORY_DOCUMENTS: dict[str, dict] = _load_storage()

def get_firestore_client():
    if not firebase_admin._apps:
        return None
    try:
        return firestore.client()
    except Exception as e:
        logger.debug(f"Firestore client initialization skipped: {e}")
        return None

def save_document(doc_data: dict) -> str:
    doc_id = doc_data.get("document_id") or str(uuid.uuid4())
    doc_data["document_id"] = doc_id
    
    db = get_firestore_client()
    if db:
        try:
            doc_ref = db.collection("documents").document(doc_id)
            doc_ref.set(doc_data)
            return doc_id
        except Exception as e:
            logger.warning(f"Firestore set() failed, falling back to memory store: {e}")

    # Fallback to persistent local store
    MEMORY_DOCUMENTS[doc_id] = doc_data
    _save_storage(MEMORY_DOCUMENTS)
    return doc_id

def get_document_by_id(doc_id: str) -> dict | None:
    db = get_firestore_client()
    if db:
        try:
            doc_ref = db.collection("documents").document(doc_id)
            doc_snap = doc_ref.get()
            if doc_snap.exists:
                return doc_snap.to_dict()
        except Exception as e:
            logger.warning(f"Firestore get() failed, checking memory store: {e}")

    return MEMORY_DOCUMENTS.get(doc_id)

def list_user_documents(user_id: str) -> list[dict]:
    db = get_firestore_client()
    if db:
        try:
            docs_ref = db.collection("documents").where("user_id", "==", user_id).order_by(
                "upload_date", direction=firestore.firestore.Query.DESCENDING
            )
            docs = docs_ref.stream()
            results = []
            for doc in docs:
                d = doc.to_dict()
                results.append(d)
            return results
        except Exception as e:
            logger.warning(f"Firestore stream() failed, checking memory store: {e}")

    # Fallback to memory store
    user_docs = [d for d in MEMORY_DOCUMENTS.values() if d.get("user_id") == user_id]
    user_docs.sort(key=lambda x: str(x.get("upload_date")), reverse=True)
    return user_docs

def update_document(doc_id: str, update_data: dict) -> bool:
    db = get_firestore_client()
    if db:
        try:
            doc_ref = db.collection("documents").document(doc_id)
            doc_ref.update(update_data)
            return True
        except Exception as e:
            logger.warning(f"Firestore update() failed, updating memory store: {e}")

    if doc_id in MEMORY_DOCUMENTS:
        MEMORY_DOCUMENTS[doc_id].update(update_data)
        _save_storage(MEMORY_DOCUMENTS)
        return True
    return False

def delete_document_by_id(doc_id: str) -> bool:
    db = get_firestore_client()
    if db:
        try:
            doc_ref = db.collection("documents").document(doc_id)
            doc_ref.delete()
            return True
        except Exception as e:
            logger.warning(f"Firestore delete() failed, removing from memory store: {e}")

    if doc_id in MEMORY_DOCUMENTS:
        del MEMORY_DOCUMENTS[doc_id]
        _save_storage(MEMORY_DOCUMENTS)
        return True
    return False
