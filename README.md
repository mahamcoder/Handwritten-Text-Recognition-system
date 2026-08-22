# Scriptly — Handwritten Text Recognition (HTR) System

Scriptly is a modern, lightweight Handwritten Text Recognition (HTR) web system built for final year university project evaluation. It enables users to upload images of handwritten notes, transcribes them using the Gemini 2.0 Flash API microservice, and allows users to edit and export the recognized text into TXT, DOCX, and PDF formats.

---

## 🏗️ Architecture & Technology Stack

- **Presentation Layer (Frontend)**: React 18 + Vite + TypeScript + Tailwind CSS ("Ink & Pixel" design system) + Framer Motion
- **Processing Layer (Backend Microservice)**: Python FastAPI + `google-generativeai` (Gemini Flash API) + Pillow + `python-docx` + `reportlab`
- **Data & Auth Layer**: Firebase Auth (Email/Password) + Cloud Firestore (Metadata & transcribed text) + Cloudinary (Image storage)

---

## 🚀 Getting Started (Windows Environment)

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.10+
- Firebase Project (Authentication & Firestore enabled)
- Cloudinary Account (Cloud Name, API Key, API Secret)
- Google Gemini API Key

---

### 1. Backend Setup (FastAPI)

1. Open PowerShell and navigate to the backend directory:
   ```powershell
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   py -m venv venv
   # or: python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
   *(If script execution is restricted on Windows PowerShell, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first)*

3. Install required Python packages:
   ```powershell
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your keys:
   ```powershell
   Copy-Item .env.example .env
   ```

5. Place your Firebase Admin Service Account key JSON file in `backend/firebase_service_account.json` (or update `FIREBASE_CREDENTIALS_PATH` in `.env`).

6. Start the backend development server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Frontend Setup (React + Vite)

1. Open a new PowerShell terminal and navigate to the frontend directory:
   ```powershell
   cd frontend
   ```

2. Install Node dependencies:
   ```powershell
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env.local` and add your Firebase Client configuration:
   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Start the frontend development server:
   ```powershell
   npm run dev
   ```
   The application will open at [http://localhost:5173](http://localhost:5173).

---

## 📁 Repository Structure

```text
HTR system/
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── config.py
│       └── main.py
└── frontend/
    ├── .env.example
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.tsx
        ├── index.css
        └── main.tsx
```
