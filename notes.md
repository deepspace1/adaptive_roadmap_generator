ls -l backend/tutor.db
file backend/tutor.db
sqlite3 backend/tutor.db ".tables"
sqlite3 backend/tutor.db "SELECT name FROM sqlite_master WHERE type='table';"


# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev