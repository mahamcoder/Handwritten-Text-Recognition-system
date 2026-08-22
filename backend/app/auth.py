import os
import logging
from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth as admin_auth
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK if service account file is present
firebase_app = None

def init_firebase_admin():
    global firebase_app
    if firebase_admin._apps:
        firebase_app = firebase_admin.get_app()
        return firebase_app

    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    try:
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_app = firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin initialized using service account: {cred_path}")
        elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            cred = credentials.ApplicationDefault()
            firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized using GOOGLE_APPLICATION_CREDENTIALS")
        else:
            logger.info("No service account JSON file found. Will use public key verification for Firebase ID tokens.")
    except Exception as e:
        logger.error(f"Firebase Admin initialization warning: {e}")

init_firebase_admin()

security = HTTPBearer(auto_error=False)

def get_current_user(credentials_auth: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    if not credentials_auth or not credentials_auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization token header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials_auth.credentials
    project_id = settings.FIREBASE_PROJECT_ID or "htrsytem"

    # Strategy 1: Try Firebase Admin SDK if service account is loaded
    if firebase_admin._apps:
        try:
            decoded_token = admin_auth.verify_id_token(token)
            uid = decoded_token.get("uid")
            email = decoded_token.get("email", "")
            if uid:
                return {"uid": uid, "email": email, "decoded_token": decoded_token}
        except Exception as admin_err:
            logger.debug(f"Admin SDK token verification skipped/failed: {admin_err}")

    # Strategy 2: Public Key Verification (no service account JSON needed)
    try:
        req = google_requests.Request()
        decoded_token = id_token.verify_firebase_token(
            token, 
            req, 
            audience=project_id
        )
        uid = decoded_token.get("sub") or decoded_token.get("user_id") or decoded_token.get("uid")
        email = decoded_token.get("email", "")
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Firebase token: missing UID claim",
            )
        return {"uid": uid, "email": email, "decoded_token": decoded_token}
    except Exception as pub_err:
        logger.error(f"Public key token verification failed: {pub_err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authorization token: {str(pub_err)}",
        )
