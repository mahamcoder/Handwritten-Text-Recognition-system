import base64
import logging
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.auth import get_current_user
from app.gemini_client import transcribe_handwriting_with_gemini
from app.db import get_document_by_id, update_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["process"])

@router.post("/demo-transcribe")
async def demo_transcribe(
    file: UploadFile = File(...)
):
    """
    Public interactive demo endpoint that accepts an image file directly
    and executes Gemini Flash HTR transcription without requiring login.
    """
    try:
        contents = await file.read()
        if not contents or len(contents) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded.")
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds 10MB limit.")
        
        recognized_text = transcribe_handwriting_with_gemini(contents)
        return {
            "status": "done",
            "recognized_text": recognized_text
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Demo transcription failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription error: {str(e)}"
        )

@router.post("/process/{document_id}")
async def process_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers Gemini Flash HTR transcription for a document ID owned by the user.
    Sets status 'processing' -> calls Gemini -> sets status 'done' or 'error'.
    """
    doc_data = get_document_by_id(document_id)

    if not doc_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    # Verify Document Ownership
    if doc_data.get("user_id") != current_user["uid"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to process this document."
        )

    image_url = doc_data.get("image_url")
    if not image_url:
        update_document(document_id, {"status": "error", "error_message": "Missing image URL in document record."})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document record is missing image URL."
        )

    # Step 1: Update status to 'processing'
    now = datetime.now(timezone.utc)
    update_document(document_id, {
        "status": "processing",
        "error_message": None,
        "updated_at": now
    })

    # Step 2: Retrieve image bytes (supports both Data URI fallback and HTTP Cloudinary URL)
    try:
        if image_url.startswith("data:"):
            _, encoded = image_url.split(",", 1)
            image_bytes = base64.b64decode(encoded)
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(image_url)
                resp.raise_for_status()
                image_bytes = resp.content
    except Exception as fetch_err:
        logger.exception(f"Failed to retrieve image bytes: {fetch_err}")
        err_msg = f"Failed to load image from storage: {str(fetch_err)}"
        update_document(document_id, {
            "status": "error",
            "error_message": err_msg,
            "updated_at": datetime.now(timezone.utc)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err_msg
        )

    # Step 3: Run Gemini API Transcription
    try:
        recognized_text = transcribe_handwriting_with_gemini(image_bytes)
        
        # Step 4: Update document status to 'done'
        finished_at = datetime.now(timezone.utc)
        update_document(document_id, {
            "status": "done",
            "recognized_text": recognized_text,
            "error_message": None,
            "engine_used": "Scriptly Neural Vision",
            "updated_at": finished_at
        })

        logger.info(f"Document {document_id} successfully transcribed with Scriptly Neural Vision.")
        return {
            "document_id": document_id,
            "status": "done",
            "recognized_text": recognized_text,
            "engine_used": "Scriptly Neural Vision"
        }

    except Exception as ocr_err:
        logger.exception(f"AI OCR recognition failed for document '{document_id}': {ocr_err}")
        err_msg = f"AI Vision Engine Transcription Error: {str(ocr_err)}"
        update_document(document_id, {
            "status": "error",
            "error_message": err_msg,
            "updated_at": datetime.now(timezone.utc)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err_msg
        )
