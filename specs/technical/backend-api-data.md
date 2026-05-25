# Backend API And Data Specification

## Current Stack

- FastAPI backend in `backend/app`.
- SQLite for local development through `backend/app/database.py`.
- Tutor orchestration in `backend/app/agents.py`.
- Existing endpoints: auth, profile, roadmap, chat, quiz submit, dashboard.

## New Or Updated API Contracts

### `POST /onboarding/diagnose`

Purpose: Ask or answer diagnostic questions before teaching.

Request:

```json
{
  "goal": "Learn Python",
  "target_subject": "Python",
  "self_reported_level": "beginner",
  "learning_style": "example_first",
  "daily_time_minutes": 30
}
```

Response:

```json
{
  "profile": {},
  "diagnostic_question": "string | null",
  "recommended_start_topic": "string",
  "plan_preview": []
}
```

### `POST /chat`

Purpose: Continue the adaptive tutor loop.

Current request shape can stay:

```json
{
  "message": "Teach me loops",
  "topic": "Loops"
}
```

Response should be expanded:

```json
{
  "message": "string",
  "updated_state": {
    "intent": {},
    "profile": {},
    "learning_plan": [],
    "lesson": {},
    "check_question": {},
    "quiz": {},
    "side_panel": {},
    "next_action": {}
  },
  "logs": []
}
```

### `POST /check-answer/submit`

Purpose: Score one free-text check answer.

Request:

```json
{
  "topic": "Loops",
  "question": "What does a loop repeat?",
  "answer": "It repeats a block for each item.",
  "expected_answer_points": ["repeats", "block", "condition or sequence"]
}
```

Response:

```json
{
  "score": 0.75,
  "feedback": "Good. Add when the loop stops.",
  "missing_points": ["stop condition"],
  "mastery_score": 0.56,
  "next_action": "practice"
}
```

### `POST /quiz/submit`

Purpose: Score quiz answers and update mastery.

Response should include:

```json
{
  "score": 0.67,
  "mastery_score": 0.72,
  "details": [],
  "passed_mastery_gate": false,
  "next_action": "practice"
}
```

## Data Model Additions

### `student_profiles`

Add columns when using a migration path:

- `pace TEXT DEFAULT 'normal'`
- `motivation TEXT DEFAULT 'curiosity'`
- `known_topics TEXT DEFAULT '[]'`
- `weak_topics TEXT DEFAULT '[]'`
- `diagnostic_state TEXT DEFAULT '{}'`

### `check_results`

New table:

```sql
CREATE TABLE IF NOT EXISTS check_results (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  score REAL NOT NULL,
  feedback TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### `learning_plan`

Allowed statuses:

- `current`
- `pending`
- `completed`
- `review`

## Mastery Update Rules

- Initial topic mastery starts at `0.20` to `0.25`.
- Correct check answer can add up to `0.08`.
- Incorrect check answer can subtract up to `0.05`.
- Quiz score has stronger weight than a single check answer.
- Mastery must stay between `0.00` and `1.00`.
- Topic is completed only at `0.80` or higher.

## Backend Acceptance Criteria

- Existing users continue to work after schema additions.
- `/chat` returns a stable `updated_state` with lesson, side panel, next action, and quiz when appropriate.
- `/check-answer/submit` can update mastery without needing a full quiz.
- `/quiz/submit` returns `passed_mastery_gate` and `next_action`.
- Roadmap updates preserve completed topics.
- Unit tests cover intent detection, roadmap insertion, mastery updates, and quiz evaluation.
