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
# Roadmap

This project uses a spec-driven adaptive roadmap to generate personalized learning plans. The roadmap composes several agent roles that work together to create, deliver, and evaluate learning content:

- **Planner:** decomposes learning goals into milestones and modules and schedules learning paths.
- **Teacher:** generates explanations, worked examples, and lesson content tailored to the learner's level.
- **Socratic coach:** asks targeted questions to surface misconceptions and prompt reflection.
- **Quiz & evaluator:** produces assessments, scores mastery, and drives spaced practice.
- **Knowledge-gap detector:** finds missing prerequisites and adjusts the plan dynamically.
- **Memory store:** persists progress, preferences, and short-term interaction history for personalization.
- **Dashboard & analytics:** visualizes progress, mastery, and recommendations for learners and instructors.
- **Research agent:** fetches and augments lessons with curated external resources.

The authoritative roadmap definitions live in the `specs/` directory (see `specs/product/` and `specs/technical/`), and the runtime orchestration is implemented in `backend/app/agents.py`.

To customize the roadmap behavior:

- Update or extend the YAML/Markdown specs in `specs/` to change learning objectives and module structure.
- Modify or add agent logic in `backend/app/agents.py` to change how plans are generated and executed.
- Tune thresholds and schemas in `backend/app/schemas.py` for mastery detection and scheduling.

Contributions: open focused PRs that update a spec, extend an agent, and include a short integration demo or test for the change.

# adaptive_roadmap_generator
