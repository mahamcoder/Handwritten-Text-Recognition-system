import io
import logging
from PIL import Image
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

PROMPT_TEXT = (
    "Transcribe all the handwritten text in this image exactly as written, "
    "preserving line breaks and paragraph structure. Do not add commentary, "
    "explanations, or formatting — output only the transcribed text. "
    "If no legible handwriting is present, output exactly: [No legible text detected in image]"
)

# Candidate model list in priority order (high free tier quota: 1,500 req/day)
DEFAULT_MODEL_CANDIDATES = [
    "gemini-3-flash-preview",
    "gemini-3-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
]

def prepare_image_for_gemini(image_bytes: bytes, max_dimension: int = 2000) -> Image.Image:
    """
    Validates and resizes image to max ~2000px on the longest side using Lanczos interpolation,
    keeping aspect ratio intact and memory footprint optimal for Gemini API request.
    """
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert RGBA / Palette images to RGB
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGB')
        
    w, h = img.size
    if max(w, h) > max_dimension:
        if w > h:
            new_w = max_dimension
            new_h = max(1, int(h * (max_dimension / w)))
        else:
            new_h = max_dimension
            new_w = max(1, int(w * (max_dimension / h)))
        
        logger.info(f"Resizing image from {w}x{h} to {new_w}x{new_h} for Gemini API input")
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    return img

def transcribe_handwriting_with_gemini(image_bytes: bytes) -> str:
    """
    Calls the Gemini Flash API to transcribe handwritten text in an image.
    Tries active model candidates and logs full tracebacks on failure.
    """
    if not settings.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not set in backend environment configuration.")
        raise ValueError("Backend server is missing GEMINI_API_KEY. Please set GEMINI_API_KEY in backend/.env")

    # Configure Gemini SDK
    genai.configure(api_key=settings.GEMINI_API_KEY)

    # Prepare input image
    pil_image = prepare_image_for_gemini(image_bytes)

    last_exception = None

    candidates = [settings.GEMINI_MODEL] if settings.GEMINI_MODEL else []
    for c in DEFAULT_MODEL_CANDIDATES:
        if c not in candidates:
            candidates.append(c)

    for model_name in candidates:
        try:
            logger.info(f"Trying Gemini model '{model_name}'...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content([PROMPT_TEXT, pil_image])
            
            if response and response.text:
                recognized_text = response.text.strip()
                logger.info(f"Successfully received transcription from model '{model_name}' ({len(recognized_text)} chars).")
                return recognized_text
            else:
                logger.warning(f"Model '{model_name}' returned an empty text response.")
                return "[No legible text detected in image]"

        except Exception as e:
            last_exception = e
            err_str = str(e).lower()
            if "404" in err_str or "not found" in err_str:
                logger.warning(f"Model '{model_name}' 404 not found, trying next candidate...")
                continue
            elif "429" in err_str or "quota" in err_str or "rate" in err_str:
                logger.warning(f"Model '{model_name}' quota/rate limit exceeded (429), trying next candidate...")
                continue
            else:
                logger.warning(f"Gemini API error with model '{model_name}': {e}. Trying next candidate...")
                continue

    # If all candidate model names failed
    if last_exception:
        logger.exception(f"All Gemini model candidates failed: {last_exception}")
        raise last_exception

    raise RuntimeError("Failed to obtain transcription from Gemini API.")
