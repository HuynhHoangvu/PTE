# ✈️ Fly-Edu – PTE Academic Practice Platform

PTE Academic practice platform: NestJS backend + Vite/React frontend + Python (FastAPI/Whisper) scoring service, with Web/Android/iOS via Capacitor.

**Stack:** NestJS · TypeORM · PostgreSQL · React + Vite + Tailwind · Zustand/TanStack Query · Gemini + Whisper (AI scoring) · JWT · Capacitor · Codemagic (iOS CI/CD)

## Quick Start

Chạy đủ 3 service (backend cần python-scorer để chấm Speaking/Writing — không bật thì tự fallback sang Gemini, xem [ai-scoring.service.ts](backend/src/ai-scoring/ai-scoring.service.ts)):

```bash
# 1. Database
createdb fly_edu

# 2. Backend — http://localhost:3000 (Swagger: /api/docs)
cd backend && cp .env.example .env   # điền DB credentials + GEMINI_API_KEY
npm install && npm run dev

# 3. Python scorer — http://127.0.0.1:8001 (Whisper transcribe + chấm Speaking/Writing)
cd python-scorer
python -m venv venv
pip install -r requirements.txt      # sau khi activate venv (xem bên dưới)
cp .env.example .env                 # điền GEMINI_API_KEY
python run_server.py                 # sau khi activate venv

# 4. Frontend (Web) — http://localhost:5173
cd frontend && npm install && npm run dev
```

**Activate venv** (PowerShell ≠ bash, chọn đúng dòng cho shell đang dùng):
```powershell
# PowerShell (Windows)
.\venv\Scripts\Activate.ps1
```
```bash
# macOS / Linux / Git Bash
source venv/bin/activate
```
Nếu không muốn activate, gọi thẳng: `.\venv\Scripts\python.exe run_server.py` (Windows) hoặc `./venv/bin/python run_server.py` (macOS/Linux).

> ⚠️ Gõ `python` mà báo lỗi mở Microsoft Store: đó là Windows "App execution alias" giả, không phải Python thật — do venv chưa được activate (PATH chưa trỏ vào `venv\Scripts`). Activate lại hoặc gọi thẳng `venv\Scripts\python.exe` như trên.
