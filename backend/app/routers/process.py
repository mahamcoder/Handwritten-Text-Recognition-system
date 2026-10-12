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

async def _fetch_image_bytes(image_url: str) -> bytes:
    """Retrieves image bytes supporting both Data URIs and HTTP/Cloudinary URLs."""
    if image_url.startswith("data:"):
        _, encoded = image_url.split(",", 1)
        return base64.b64decode(encoded)
    else:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            return resp.content


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


@router.post("/demo-transcribe-batch")
async def demo_transcribe_batch(
    files: list[UploadFile] = File(...)
):
    """
    Public interactive demo endpoint that accepts multiple image files
    and transcribes them sequentially, returning combined text and page-by-page results.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded.")
    if len(files) > 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Demo allows maximum 10 images.")

    try:
        pages = []
        page_texts = []
        for idx, file in enumerate(files, start=1):
            contents = await file.read()
            if not contents or len(contents) == 0:
                continue
            text = transcribe_handwriting_with_gemini(contents)
            pages.append({"page_number": idx, "filename": file.filename, "recognized_text": text})
            if len(files) > 1:
                page_texts.append(f"--- Page {idx} ({file.filename or 'Image'}) ---\n{text}")
            else:
                page_texts.append(text)

        return {
            "status": "done",
            "recognized_text": "\n\n".join(page_texts),
            "pages": pages,
            "page_count": len(pages)
        }
    except Exception as e:
        logger.exception(f"Batch demo transcription failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch demo error: {str(e)}"
        )


@router.post("/process/{document_id}")
async def process_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers Gemini Flash HTR transcription for a document ID owned by the user.
    Supports single-image and multi-page documents (transcribes all pages in sequence).
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

    # Determine image URLs (support multi-page image_urls and legacy image_url)
    image_urls = doc_data.get("image_urls")
    if not image_urls:
        if doc_data.get("image_url"):
            image_urls = [doc_data.get("image_url")]
        else:
            image_urls = []

    if not image_urls:
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

    # Step 2: Retrieve image bytes and transcribe each page
    try:
        pages = []
        page_texts = []
        total_pages = len(image_urls)

        for idx, url in enumerate(image_urls, start=1):
            logger.info(f"Transcribing page {idx}/{total_pages} for document {document_id}...")
            image_bytes = await _fetch_image_bytes(url)
            page_text = transcribe_handwriting_with_gemini(image_bytes)
            pages.append({
                "page_number": idx,
                "image_url": url,
                "recognized_text": page_text
            })

            if total_pages > 1:
                page_texts.append(f"--- Page {idx} ---\n{page_text}")
            else:
                page_texts.append(page_text)

        recognized_text = "\n\n".join(page_texts)

        # Step 3: Update document status to 'done'
        finished_at = datetime.now(timezone.utc)
        update_document(document_id, {
            "status": "done",
            "recognized_text": recognized_text,
            "pages": pages,
            "page_count": total_pages,
            "error_message": None,
            "engine_used": "Scriptly Neural Vision",
            "updated_at": finished_at
        })

        logger.info(f"Document {document_id} ({total_pages} pages) successfully transcribed.")
        return {
            "document_id": document_id,
            "status": "done",
            "recognized_text": recognized_text,
            "pages": pages,
            "page_count": total_pages,
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


@router.post("/process-batch")
async def process_batch_documents(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers transcription for multiple documents in sequence.
    Returns status and recognized text for each document.
    """
    document_ids = payload.get("document_ids", [])
    if not document_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No document IDs provided."
        )

    results = []
    for doc_id in document_ids:
        try:
            res = await process_document(doc_id, current_user)
            results.append({
                "document_id": doc_id,
                "status": "done",
                "recognized_text": res.get("recognized_text", "")
            })
        except Exception as e:
            results.append({
                "document_id": doc_id,
                "status": "error",
                "error": str(e)
            })

    return {"results": results}

