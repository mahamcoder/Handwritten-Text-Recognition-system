import base64
import logging
import uuid
import cloudinary
import cloudinary.uploader
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Cloudinary configuration if keys exist
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

def upload_image_to_cloudinary(file_bytes: bytes, folder: str = "scriptly_documents") -> dict:
    """
    Uploads raw image bytes to Cloudinary server-side using signed upload.
    If Cloudinary credentials are not set in .env, falls back to data URI format.
    """
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
        try:
            response = cloudinary.uploader.upload(
                file_bytes,
                folder=folder,
                resource_type="image"
            )
            return {
                "secure_url": response.get("secure_url"),
                "public_id": response.get("public_id"),
            }
        except Exception as e:
            logger.error(f"Cloudinary upload error: {e}. Falling back to data URI...", exc_info=True)

    # Fallback to Base64 Data URI if Cloudinary credentials are not configured
    logger.info("Using Base64 Data URI image storage fallback")
    b64_str = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:image/png;base64,{b64_str}"
    return {
        "secure_url": data_url,
        "public_id": f"local_{uuid.uuid4().hex[:8]}"
    }
