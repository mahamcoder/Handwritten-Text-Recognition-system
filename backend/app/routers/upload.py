import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from app.auth import get_current_user
from app.cloudinary_client import upload_image_to_cloudinary
from app.db import save_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts an image file (JPEG/PNG, max 10MB), uploads it to Cloudinary,
    and creates a document entry with status 'uploaded'.
    """
    # 1. Validate Content Type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        filename_lower = file.filename.lower() if file.filename else ""
        if not (filename_lower.endswith(".jpg") or filename_lower.endswith(".jpeg") or filename_lower.endswith(".png")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file format '{file.content_type}'. Only JPEG and PNG images are allowed."
            )

    # 2. Read File Bytes & Validate Size
    try:
        contents = await file.read()
    except Exception as e:
        logger.error(f"Error reading file stream: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read uploaded file: {str(e)}"
        )

    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({file_size / (1024*1024):.2f}MB) exceeds the maximum allowed limit of 10MB."
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    # 3. Upload to Cloudinary
    try:
        cloudinary_res = upload_image_to_cloudinary(contents, folder="scriptly_documents")
        image_url = cloudinary_res["secure_url"]
        image_public_id = cloudinary_res["public_id"]
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image storage upload failed: {str(e)}"
        )

    # 4. Save Document Metadata
    try:
        document_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        doc_data = {
            "document_id": document_id,
            "user_id": current_user["uid"],
            "image_url": image_url,
            "image_public_id": image_public_id,
            "recognized_text": "",
            "status": "uploaded",
            "error_message": None,
            "engine_used": "Scriptly Neural Vision",
            "file_size": file_size,
            "upload_date": now,
            "updated_at": now
        }
        save_document(doc_data)

        logger.info(f"Document {document_id} created for user {current_user['uid']}")
        return {
            "document_id": document_id,
            "image_url": image_url,
            "status": "uploaded"
        }
    except Exception as e:
        logger.error(f"Save error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record document metadata: {str(e)}"
        )


@router.post("/upload-batch")
async def upload_batch_documents(
    files: list[UploadFile] = File(...),
    mode: str = "combined",
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts multiple image files (JPEG/PNG, max 10MB each).
    Uploads each to Cloudinary (or local Data URI fallback).
    If mode == 'combined': creates a single multi-page document entry.
    If mode == 'individual': creates an individual document entry for each image.
    """
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded. Please select at least one image."
        )

    if len(files) > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch upload limit exceeded. You can upload up to 20 images at a time."
        )

    uploaded_items = []
    total_size = 0

    for idx, file in enumerate(files):
        # 1. Validate Content Type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            filename_lower = file.filename.lower() if file.filename else ""
            if not (filename_lower.endswith(".jpg") or filename_lower.endswith(".jpeg") or filename_lower.endswith(".png")):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{file.filename}' has invalid format '{file.content_type}'. Only JPEG and PNG images are allowed."
                )

        # 2. Read File Bytes & Validate Size
        try:
            contents = await file.read()
        except Exception as e:
            logger.error(f"Error reading file '{file.filename}': {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not read uploaded file '{file.filename}': {str(e)}"
            )

        file_size = len(contents)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename}' size ({file_size / (1024*1024):.2f}MB) exceeds the 10MB limit."
            )

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename}' is empty (0 bytes)."
            )

        # 3. Upload to Cloudinary / storage
        try:
            cloudinary_res = upload_image_to_cloudinary(contents, folder="scriptly_documents")
            uploaded_items.append({
                "secure_url": cloudinary_res["secure_url"],
                "public_id": cloudinary_res["public_id"],
                "file_size": file_size,
                "filename": file.filename or f"image_{idx+1}.jpg"
            })
            total_size += file_size
        except Exception as e:
            logger.error(f"Upload failed for '{file.filename}': {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload '{file.filename}': {str(e)}"
            )

    now = datetime.now(timezone.utc)

    # 4. Handle Combined Mode (Multi-Page Document)
    if mode == "combined":
        doc_id = str(uuid.uuid4())
        image_urls = [item["secure_url"] for item in uploaded_items]
        image_public_ids = [item["public_id"] for item in uploaded_items]

        doc_data = {
            "document_id": doc_id,
            "user_id": current_user["uid"],
            "image_url": image_urls[0],
            "image_urls": image_urls,
            "image_public_ids": image_public_ids,
            "page_count": len(image_urls),
            "recognized_text": "",
            "status": "uploaded",
            "error_message": None,
            "engine_used": "Scriptly Neural Vision",
            "file_size": total_size,
            "upload_date": now,
            "updated_at": now
        }
        save_document(doc_data)
        logger.info(f"Combined document {doc_id} created with {len(image_urls)} pages for user {current_user['uid']}")
        return {
            "document_id": doc_id,
            "mode": "combined",
            "page_count": len(image_urls),
            "image_url": image_urls[0],
            "image_urls": image_urls,
            "status": "uploaded"
        }

    # 5. Handle Individual Mode (One Document per Image)
    created_docs = []
    for item in uploaded_items:
        doc_id = str(uuid.uuid4())
        doc_data = {
            "document_id": doc_id,
            "user_id": current_user["uid"],
            "image_url": item["secure_url"],
            "image_urls": [item["secure_url"]],
            "image_public_id": item["public_id"],
            "page_count": 1,
            "filename": item["filename"],
            "recognized_text": "",
            "status": "uploaded",
            "error_message": None,
            "engine_used": "Scriptly Neural Vision",
            "file_size": item["file_size"],
            "upload_date": now,
            "updated_at": now
        }
        save_document(doc_data)
        created_docs.append({
            "document_id": doc_id,
            "image_url": item["secure_url"],
            "filename": item["filename"],
            "status": "uploaded"
        })

    logger.info(f"Created {len(created_docs)} individual documents for user {current_user['uid']}")
    return {
        "mode": "individual",
        "count": len(created_docs),
        "documents": created_docs
    }

