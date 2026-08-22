from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import upload, process, documents

app = FastAPI(
    title="Scriptly HTR Backend API",
    description="Backend microservice for Scriptly Handwritten Text Recognition API powered by Gemini Flash",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(process.router)
app.include_router(documents.router)

@app.get("/")
def read_root():
    return {
        "name": "Scriptly HTR API",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "scriptly-backend"
    }
