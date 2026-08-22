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
