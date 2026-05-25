# Adaptive AI Personal Tutor

A production-shaped multi-agent AI tutor prototype with a FastAPI backend and a Next.js App Router frontend.

## What is included

- JWT authentication with refresh tokens
- Adaptive learning roadmap generation
- Multi-agent tutor loop: planner, teacher, Socratic coach, quiz, evaluator, knowledge gaps, memory, dashboard, and research
- Mastery tracking and quiz history
- Dashboard analytics with Chart.js
- Polished responsive UI with TailwindCSS, Zustand, and lucide-react
- Docker Compose services for frontend, backend, Postgres, Redis, and ChromaDB
- OpenRouter integration using `z-ai/glm-4.5-air:free`

## Specs

This project now has a spec-driven roadmap for making the tutor more personalized and adaptive:

- `SPEC_DRIVEN_CODING.md`
- `specs/product/adaptive-tutor-goal.md`
- `specs/technical/tutor-tools.md`
- `specs/technical/backend-api-data.md`
- `specs/technical/frontend-experience.md`
- `specs/technical/implementation-plan.md`

## Quick Start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend uses `backend/tutor.db` by default for local development.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Backend:

```bash
JWT_SECRET=change-me
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=z-ai/glm-4.5-air:free
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=14
```

Frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Docker

```bash
docker compose up --build
```

## Notes

The current agent engine is deterministic so the app works immediately without paid API keys. The `backend/app/agents.py` module is structured around shared state JSON and can be upgraded to call LangGraph/OpenAI nodes behind the same contracts.
# adaptive_roadmap_generator
