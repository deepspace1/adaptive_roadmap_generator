from __future__ import annotations

import uuid
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .agents import build_learning_plan, evaluate_check_answer, evaluate_quiz, generate_roadmap, get_dashboard, run_tutor_loop
from .database import dumps, get_db, init_db, loads, now_iso, row_to_dict, rows_to_dicts
from .llm import chat_completion
from .schemas import (
    CheckAnswerSubmitRequest,
    ChatRequest,
    LoginRequest,
    OnboardingSubmitRequest,
    ProfileUpdateRequest,
    QuizSubmitRequest,
    RefreshRequest,
    RegisterRequest,
    RoadmapModuleUpdateRequest,
    RoadmapRegenerateRequest,
    SkillAssessmentEvaluateRequest,
    SkillAssessmentQuestionsRequest,
    TokenResponse,
)
from .security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password


app = FastAPI(title="Adaptive AI Personal Tutor", version="1.0.0")

ASSESSMENT_CACHE: dict[str, dict[str, Any]] = {}
ASSESSMENT_TTL_SECONDS = 10 * 60

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


def current_user(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    with get_db() as db:
        user = row_to_dict(db.execute("SELECT id, name, email, learning_goal, created_at, current_level FROM users WHERE id = ?", (payload["sub"],)).fetchone())
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def clean_expired_assessments() -> None:
    now = time.time()
    expired = [assessment_id for assessment_id, item in ASSESSMENT_CACHE.items() if item["expires_at"] <= now]
    for assessment_id in expired:
        ASSESSMENT_CACHE.pop(assessment_id, None)


def fallback_assessment_questions(topic: str, level: str) -> list[dict[str, Any]]:
    lowered = topic.lower()
    if any(term in lowered for term in ["artificial intelligence", "machine learning", " ai", "ai ", "deep learning", "llm"]):
        return [
            {
                "id": "q1",
                "question": "You train a model and it scores 98% on training data but 61% on new examples. What is the most likely issue?",
                "options": {"A": "Underfitting", "B": "Overfitting", "C": "Perfect generalization", "D": "The loss function is unnecessary"},
                "correct": "B",
            },
            {
                "id": "q2",
                "question": "Why do ML workflows keep separate training and validation/test data?",
                "options": {"A": "To make training slower", "B": "To check how the model handles unseen data", "C": "To avoid using metrics", "D": "To make labels optional"},
                "correct": "B",
            },
            {
                "id": "q3",
                "question": "In an LLM app, what does retrieval-augmented generation usually add?",
                "options": {"A": "Relevant external context before the model answers", "B": "A larger monitor for the developer", "C": "Random answers for creativity", "D": "A way to avoid evaluating outputs"},
                "correct": "A",
            },
            {
                "id": "q4",
                "question": "Which metric is usually more informative than accuracy for a highly imbalanced fraud-detection dataset?",
                "options": {"A": "File size", "B": "Precision and recall", "C": "Number of columns only", "D": "Alphabetical order of labels"},
                "correct": "B",
            },
            {
                "id": "q5",
                "question": "What is data leakage?",
                "options": {"A": "Deleting old CSV files", "B": "Using future or target-related information during training/evaluation", "C": "Compressing a dataset", "D": "Training with too little RAM"},
                "correct": "B",
            },
        ]
    if any(term in lowered for term in ["stock", "market", "trading", "invest", "finance"]):
        return [
            {
                "id": "q1",
                "question": "What does diversification mainly reduce in a beginner portfolio?",
                "options": {"A": "Company-specific risk", "B": "All possible losses", "C": "Taxes automatically", "D": "The need to learn"},
                "correct": "A",
            },
            {
                "id": "q2",
                "question": "A stock has high volume on a large price move. What does volume help you judge?",
                "options": {"A": "Whether the move had strong participation", "B": "The company's exact future profit", "C": "A guaranteed buy signal", "D": "The dividend payment date"},
                "correct": "A",
            },
            {
                "id": "q3",
                "question": "Why might a low P/E ratio not automatically mean a stock is cheap?",
                "options": {"A": "The company may have weak growth, high risk, or falling earnings", "B": "P/E is unrelated to price", "C": "Low P/E guarantees bankruptcy", "D": "P/E only applies to ETFs"},
                "correct": "A",
            },
            {
                "id": "q4",
                "question": "What should position sizing control before entering a trade or investment?",
                "options": {"A": "Maximum possible loss relative to your portfolio", "B": "The stock exchange's opening time", "C": "The company's logo design", "D": "How many opinions you read"},
                "correct": "A",
            },
            {
                "id": "q5",
                "question": "What is the purpose of an investment thesis?",
                "options": {"A": "To write a testable reason for buying, holding, or avoiding an asset", "B": "To guarantee profit", "C": "To replace risk management", "D": "To copy social media trades"},
                "correct": "A",
            },
        ]
    return [
        {
            "id": "q1",
            "question": f"What is the most reliable way to prove beginner-level understanding of {topic}?",
            "options": {"A": "Define terms and apply them to a small new example", "B": "Read the same definition repeatedly", "C": "Skip practice until advanced topics", "D": "Avoid feedback"},
            "correct": "A",
        },
        {
            "id": "q2",
            "question": f"When learning {topic}, why are prerequisites important?",
            "options": {"A": "They make the topic impossible", "B": "They provide the concepts needed to understand later skills", "C": "They replace practice", "D": "They are only useful for exams"},
            "correct": "B",
        },
        {
            "id": "q3",
            "question": f"What should you do after finishing a lesson in {topic}?",
            "options": {"A": "Immediately switch topics", "B": "Create a small applied output and check mistakes", "C": "Only highlight notes", "D": "Avoid testing yourself"},
            "correct": "B",
        },
        {
            "id": "q4",
            "question": f"What makes a project useful for learning {topic}?",
            "options": {"A": "It combines multiple skills and has clear success criteria", "B": "It has no constraints", "C": "It avoids review", "D": "It is copied without changes"},
            "correct": "A",
        },
        {
            "id": "q5",
            "question": f"What is a good sign you are ready for harder {topic} material?",
            "options": {"A": "You can explain decisions, complete practice, and fix mistakes", "B": "You feel bored after one video", "C": "You memorized one phrase", "D": "You never ask questions"},
            "correct": "A",
        },
    ]


def parse_assessment_questions(content: str) -> list[dict[str, Any]]:
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        match = content[content.find("{") : content.rfind("}") + 1]
        payload = json.loads(match)
    questions = payload.get("questions")
    if not isinstance(questions, list) or len(questions) != 5:
        raise ValueError("Assessment must contain exactly 5 questions")
    normalized = []
    for index, question in enumerate(questions, start=1):
        options = question.get("options")
        correct = question.get("correct")
        if not isinstance(options, dict) or set(options.keys()) != {"A", "B", "C", "D"} or correct not in {"A", "B", "C", "D"}:
            raise ValueError("Assessment question options are invalid")
        normalized.append(
            {
                "id": str(question.get("id") or f"q{index}"),
                "question": str(question.get("question") or ""),
                "options": {key: str(options[key]) for key in ["A", "B", "C", "D"]},
                "correct": correct,
            }
        )
    return normalized


async def generate_assessment_questions(topic: str, level: str) -> list[dict[str, Any]]:
    prompt = (
        f"Generate exactly 5 diagnostic multiple-choice questions to assess a {level} learner's real, topic-specific knowledge of {topic}. "
        "Do not ask generic study-skills questions. Test actual concepts, mistakes, tradeoffs, terminology, and application scenarios from the topic. "
        "Each question must have 4 options (A, B, C, D), one correct answer, and plausible wrong answers. Return ONLY valid JSON: "
        "{ 'questions': [ { 'id': 'q1', 'question': '...', 'options': {'A':'...','B':'...','C':'...','D':'...'}, 'correct': 'A' } ] }"
    )
    result = await chat_completion([{"role": "user", "content": prompt}], max_tokens=1800, temperature=0.3)
    if result is None or not result.get("content"):
        return fallback_assessment_questions(topic, level)
    try:
        return parse_assessment_questions(result["content"])
    except (json.JSONDecodeError, ValueError):
        return fallback_assessment_questions(topic, level)


def profile_from_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    row = dict(row)
    row["prior_experience"] = loads(row.get("prior_experience"), [])
    row["onboarding_completed"] = bool(row.get("onboarding_completed"))
    return row


def get_profile(user_id: str) -> dict[str, Any] | None:
    with get_db() as db:
        row = row_to_dict(db.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user_id,)).fetchone())
    return profile_from_row(row)


def roadmap_modules(roadmap: dict[str, Any]) -> list[dict[str, Any]]:
    return [module for phase in roadmap.get("phases", []) for module in phase.get("modules", [])]


def apply_progress_to_roadmap(roadmap: dict[str, Any], progress_rows: list[dict[str, Any]]) -> dict[str, Any]:
    progress = {row["module_id"]: row["status"] for row in progress_rows}
    completed = {module_id for module_id, module_status in progress.items() if module_status == "completed"}
    for module in roadmap_modules(roadmap):
        module_id = module["module_id"]
        if module_id in progress:
            module["status"] = progress[module_id]
        elif module.get("status") == "locked" and all(prereq in completed for prereq in module.get("prerequisites", [])):
            module["status"] = "available"
        elif module.get("status") not in {"available", "locked", "in_progress", "completed"}:
            module["status"] = "locked"
    return roadmap


def calculate_roadmap_stats(roadmap: dict[str, Any], progress_rows: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    modules = roadmap_modules(roadmap)
    modules_by_id = {module["module_id"]: module for module in modules}
    total = len(modules)
    completed = sum(1 for module in modules if module.get("status") == "completed")
    in_progress = sum(1 for module in modules if module.get("status") == "in_progress")
    current_phase = 1
    current_phase_title = roadmap.get("phases", [{}])[0].get("phase_title", "Start")
    for phase in roadmap.get("phases", []):
        if any(module.get("status") in {"available", "in_progress"} for module in phase.get("modules", [])):
            current_phase = int(phase.get("phase_number", 1))
            current_phase_title = phase.get("phase_title", current_phase_title)
            break
    next_module = next((module for module in modules if module.get("status") == "in_progress"), None) or next(
        (module for module in modules if module.get("status") == "available"),
        None,
    )
    weeks_remaining = max(0, int(roadmap.get("total_duration_weeks", 0) * (1 - (completed / max(total, 1)))))
    estimated = (datetime.now(timezone.utc) + timedelta(weeks=weeks_remaining)).date().isoformat()
    week_start = datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())
    completed_this_week = 0
    hours_logged_this_week = 0
    active_dates = set()
    for row in progress_rows or []:
        completed_at = row.get("completed_at")
        if not completed_at:
            continue
        try:
            completed_dt = datetime.fromisoformat(completed_at)
        except ValueError:
            continue
        active_dates.add(completed_dt.date().isoformat())
        if completed_dt >= week_start:
            completed_this_week += 1
            hours_logged_this_week += int(modules_by_id.get(row["module_id"], {}).get("estimated_hours", 0))
    return {
        "total_modules": total,
        "completed_modules": completed,
        "in_progress_modules": in_progress,
        "completion_percentage": round((completed / max(total, 1)) * 100),
        "current_phase": current_phase,
        "current_phase_title": current_phase_title,
        "estimated_completion_date": estimated,
        "next_module_id": next_module.get("module_id") if next_module else None,
        "next_module_title": next_module.get("title") if next_module else None,
        "weekly_goal_hours": round(float(roadmap.get("weekly_hours_commitment", 0)), 1),
        "hours_logged_this_week": hours_logged_this_week,
        "modules_completed_this_week": completed_this_week,
        "learning_streak": len(active_dates),
    }


def active_roadmap_row(user_id: str) -> dict[str, Any] | None:
    with get_db() as db:
        return row_to_dict(
            db.execute(
                "SELECT * FROM roadmaps WHERE user_id = ? AND is_active = 1 ORDER BY version DESC, id DESC LIMIT 1",
                (user_id,),
            ).fetchone()
        )


def ensure_initial_progress(user_id: str, roadmap_id: int, roadmap: dict[str, Any]) -> None:
    with get_db() as db:
        existing = db.execute("SELECT COUNT(*) AS count FROM module_progress WHERE user_id = ? AND roadmap_id = ?", (user_id, roadmap_id)).fetchone()["count"]
        if existing:
            return
        for module in roadmap_modules(roadmap):
            if module.get("status") == "available":
                db.execute(
                    "INSERT OR IGNORE INTO module_progress (user_id, roadmap_id, module_id, status) VALUES (?, ?, ?, ?)",
                    (user_id, roadmap_id, module["module_id"], "available"),
                )


def unlock_available_modules(user_id: str, roadmap_id: int, roadmap: dict[str, Any]) -> None:
    with get_db() as db:
        rows = rows_to_dicts(db.execute("SELECT module_id, status FROM module_progress WHERE user_id = ? AND roadmap_id = ?", (user_id, roadmap_id)).fetchall())
        completed = {row["module_id"] for row in rows if row["status"] == "completed"}
        known = {row["module_id"] for row in rows}
        for module in roadmap_modules(roadmap):
            module_id = module["module_id"]
            if module_id in known:
                continue
            if module.get("status") == "available" or all(prereq in completed for prereq in module.get("prerequisites", [])):
                db.execute(
                    "INSERT OR IGNORE INTO module_progress (user_id, roadmap_id, module_id, status) VALUES (?, ?, ?, ?)",
                    (user_id, roadmap_id, module_id, "available"),
                )


def roadmap_response(user_id: str) -> dict[str, Any]:
    row = active_roadmap_row(user_id)
    if not row:
        raise HTTPException(status_code=404, detail="No active roadmap found")
    roadmap = loads(row["roadmap_json"], {})
    ensure_initial_progress(user_id, row["id"], roadmap)
    unlock_available_modules(user_id, row["id"], roadmap)
    with get_db() as db:
        progress_rows = rows_to_dicts(
            db.execute(
                "SELECT module_id, status, started_at, completed_at FROM module_progress WHERE user_id = ? AND roadmap_id = ?",
                (user_id, row["id"]),
            ).fetchall()
        )
    roadmap = apply_progress_to_roadmap(roadmap, progress_rows)
    return {"roadmap_id": row["id"], "roadmap": roadmap, "stats": calculate_roadmap_stats(roadmap, progress_rows), "module_progress": progress_rows}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "timestamp": now_iso()}


@app.post("/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest) -> TokenResponse:
    user_id = str(uuid.uuid4())
    with get_db() as db:
        exists = db.execute("SELECT id FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Email already registered")
        db.execute(
            "INSERT INTO users (id, name, email, password_hash, learning_goal, created_at, current_level) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, payload.name, payload.email.lower(), hash_password(payload.password), payload.learning_goal, now_iso(), "Beginner"),
        )
        db.execute(
            "INSERT INTO student_profiles (student_id, learning_style, target_subject, daily_time_minutes, preferred_difficulty, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, "balanced", payload.learning_goal, 30, "adaptive", now_iso()),
        )
    build_learning_plan(user_id, payload.learning_goal)
    return TokenResponse(access_token=create_access_token(user_id), refresh_token=create_refresh_token(user_id))


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    with get_db() as db:
        user = db.execute("SELECT id, password_hash FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(user["id"]), refresh_token=create_refresh_token(user["id"]))


@app.post("/auth/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest) -> TokenResponse:
    decoded = decode_token(payload.refresh_token, expected_type="refresh")
    return TokenResponse(access_token=create_access_token(decoded["sub"]), refresh_token=create_refresh_token(decoded["sub"]))


@app.get("/me")
def me(user: dict = Depends(current_user)) -> dict:
    with get_db() as db:
        profile = row_to_dict(db.execute("SELECT * FROM student_profiles WHERE student_id = ?", (user["id"],)).fetchone())
    return {"user": user, "profile": profile}


@app.patch("/profile")
def update_profile(payload: ProfileUpdateRequest, user: dict = Depends(current_user)) -> dict:
    with get_db() as db:
        db.execute(
            """
            UPDATE student_profiles
            SET learning_style = ?, target_subject = ?, daily_time_minutes = ?, preferred_difficulty = ?
            WHERE student_id = ?
            """,
            (payload.learning_style, payload.target_subject, payload.daily_time_minutes, payload.preferred_difficulty, user["id"]),
        )
        profile = row_to_dict(db.execute("SELECT * FROM student_profiles WHERE student_id = ?", (user["id"],)).fetchone())
    return {"profile": profile}


@app.get("/roadmap")
def roadmap(user: dict = Depends(current_user)) -> dict:
    return {"plan": build_learning_plan(user["id"], user["learning_goal"])}


@app.post("/chat")
async def chat(payload: ChatRequest, user: dict = Depends(current_user)) -> dict:
    return await run_tutor_loop(user["id"], payload.message, payload.topic)


@app.post("/quiz/submit")
def submit_quiz(payload: QuizSubmitRequest, user: dict = Depends(current_user)) -> dict:
    return evaluate_quiz(user["id"], payload.topic, payload.answers, payload.questions)


@app.post("/check-answer/submit")
def submit_check_answer(payload: CheckAnswerSubmitRequest, user: dict = Depends(current_user)) -> dict:
    return evaluate_check_answer(user["id"], payload.topic, payload.question, payload.answer, payload.expected_answer_points)


@app.get("/dashboard")
def dashboard(user: dict = Depends(current_user)) -> dict:
    return get_dashboard(user["id"])


@app.get("/api/onboarding/status")
def onboarding_status(user: dict = Depends(current_user)) -> dict:
    profile = get_profile(user["id"])
    return {"completed": bool(profile and profile.get("onboarding_completed")), "profile": profile}


@app.post("/api/skill-assessment/questions")
async def skill_assessment_questions(payload: SkillAssessmentQuestionsRequest, user: dict = Depends(current_user)) -> dict:
    clean_expired_assessments()
    questions = await generate_assessment_questions(payload.topic, payload.level)
    assessment_id = str(uuid.uuid4())
    ASSESSMENT_CACHE[assessment_id] = {
        "user_id": user["id"],
        "correct": {question["id"]: question["correct"] for question in questions},
        "expires_at": time.time() + ASSESSMENT_TTL_SECONDS,
    }
    safe_questions = [
        {"id": question["id"], "question": question["question"], "options": question["options"]}
        for question in questions
    ]
    return {"assessment_id": assessment_id, "questions": safe_questions}


@app.post("/api/skill-assessment/evaluate")
def skill_assessment_evaluate(payload: SkillAssessmentEvaluateRequest, user: dict = Depends(current_user)) -> dict:
    clean_expired_assessments()
    cached = ASSESSMENT_CACHE.get(payload.assessment_id)
    if not cached or cached["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Session expired, retake quiz")
    correct_answers = cached["correct"]
    total = len(correct_answers)
    correct = sum(1 for question_id, answer in payload.answers.items() if correct_answers.get(question_id) == answer)
    score = round((correct / max(total, 1)) * 100)
    if score <= 39:
        assessed_level = "beginner"
    elif score <= 69:
        assessed_level = "intermediate"
    elif score <= 89:
        assessed_level = "advanced"
    else:
        assessed_level = "expert"
    feedback = {
        "beginner": "You have a good starting point, so the roadmap will build foundations carefully.",
        "intermediate": "You know some essentials, so the roadmap will mix review with practical depth.",
        "advanced": "You are ready for challenging applications with a few targeted checks.",
        "expert": "You showed strong command, so the roadmap will emphasize projects and refinement.",
    }[assessed_level]
    ASSESSMENT_CACHE.pop(payload.assessment_id, None)
    return {"score": correct, "total": total, "assessed_level": assessed_level, "feedback": feedback}


@app.post("/api/onboarding/submit")
async def onboarding_submit(payload: OnboardingSubmitRequest, user: dict = Depends(current_user)) -> dict:
    profile = payload.model_dump()
    profile["learner_fingerprint"] = user["id"]
    with get_db() as db:
        db.execute(
            """
            INSERT INTO user_profiles (
                user_id, topic, goal, deadline, skill_level, prior_experience, related_skills,
                daily_time_minutes, learning_style, pace, assessed_level, onboarding_completed, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                topic = excluded.topic,
                goal = excluded.goal,
                deadline = excluded.deadline,
                skill_level = excluded.skill_level,
                prior_experience = excluded.prior_experience,
                related_skills = excluded.related_skills,
                daily_time_minutes = excluded.daily_time_minutes,
                learning_style = excluded.learning_style,
                pace = excluded.pace,
                assessed_level = excluded.assessed_level,
                onboarding_completed = 1
            """,
            (
                user["id"],
                profile["topic"],
                profile["goal"],
                profile["deadline"],
                profile["skill_level"],
                dumps(profile["prior_experience"]),
                profile["related_skills"],
                profile["daily_time_minutes"],
                profile["learning_style"],
                profile["pace"],
                profile["assessed_level"],
                now_iso(),
            ),
        )
    try:
        roadmap = await generate_roadmap(profile)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    with get_db() as db:
        current = db.execute("SELECT COALESCE(MAX(version), 0) AS version FROM roadmaps WHERE user_id = ?", (user["id"],)).fetchone()["version"]
        db.execute("UPDATE roadmaps SET is_active = 0 WHERE user_id = ?", (user["id"],))
        cursor = db.execute(
            "INSERT INTO roadmaps (user_id, topic, roadmap_json, version, created_at, is_active) VALUES (?, ?, ?, ?, ?, 1)",
            (user["id"], profile["topic"], dumps(roadmap), int(current) + 1, now_iso()),
        )
        roadmap_id = int(cursor.lastrowid)
    ensure_initial_progress(user["id"], roadmap_id, roadmap)
    return {"success": True, "roadmap_id": roadmap_id, "roadmap": roadmap}


@app.get("/api/roadmap/active")
def roadmap_active(user: dict = Depends(current_user)) -> dict:
    return roadmap_response(user["id"])


@app.patch("/api/roadmap/module/{module_id}")
def roadmap_module_update(module_id: str, payload: RoadmapModuleUpdateRequest, user: dict = Depends(current_user)) -> dict:
    row = active_roadmap_row(user["id"])
    if not row:
        raise HTTPException(status_code=404, detail="No active roadmap found")
    roadmap = loads(row["roadmap_json"], {})
    module_ids = {module["module_id"] for module in roadmap_modules(roadmap)}
    if module_id not in module_ids:
        raise HTTPException(status_code=404, detail="Module not found")
    timestamp = now_iso()
    started_at = timestamp if payload.status == "in_progress" else None
    completed_at = timestamp if payload.status == "completed" else None
    with get_db() as db:
        db.execute(
            """
            INSERT INTO module_progress (user_id, roadmap_id, module_id, status, started_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, roadmap_id, module_id) DO UPDATE SET
                status = excluded.status,
                started_at = COALESCE(module_progress.started_at, excluded.started_at),
                completed_at = excluded.completed_at
            """,
            (user["id"], row["id"], module_id, payload.status, started_at, completed_at),
        )
    unlock_available_modules(user["id"], row["id"], roadmap)
    return roadmap_response(user["id"])


@app.post("/api/roadmap/regenerate")
async def roadmap_regenerate(payload: RoadmapRegenerateRequest, user: dict = Depends(current_user)) -> dict:
    profile = get_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Complete onboarding before regenerating a roadmap")
    allowed = {
        "topic",
        "goal",
        "deadline",
        "skill_level",
        "prior_experience",
        "related_skills",
        "daily_time_minutes",
        "learning_style",
        "pace",
        "assessed_level",
    }
    merged = {key: value for key, value in profile.items() if key in allowed}
    merged["learner_fingerprint"] = user["id"]
    for key, value in payload.updates.items():
        if key in allowed:
            merged[key] = value
    if not isinstance(merged.get("prior_experience"), list):
        merged["prior_experience"] = []
    try:
        roadmap = await generate_roadmap(merged)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    with get_db() as db:
        db.execute(
            """
            UPDATE user_profiles
            SET topic = ?, goal = ?, deadline = ?, skill_level = ?, prior_experience = ?, related_skills = ?,
                daily_time_minutes = ?, learning_style = ?, pace = ?, assessed_level = ?, onboarding_completed = 1
            WHERE user_id = ?
            """,
            (
                merged["topic"],
                merged["goal"],
                merged["deadline"],
                merged["skill_level"],
                dumps(merged["prior_experience"]),
                str(merged.get("related_skills", "")),
                int(merged["daily_time_minutes"]),
                merged["learning_style"],
                merged["pace"],
                merged["assessed_level"],
                user["id"],
            ),
        )
        current = db.execute("SELECT COALESCE(MAX(version), 0) AS version FROM roadmaps WHERE user_id = ?", (user["id"],)).fetchone()["version"]
        db.execute("UPDATE roadmaps SET is_active = 0 WHERE user_id = ?", (user["id"],))
        cursor = db.execute(
            "INSERT INTO roadmaps (user_id, topic, roadmap_json, version, created_at, is_active) VALUES (?, ?, ?, ?, ?, 1)",
            (user["id"], merged["topic"], dumps(roadmap), int(current) + 1, now_iso()),
        )
        roadmap_id = int(cursor.lastrowid)
    ensure_initial_progress(user["id"], roadmap_id, roadmap)
    return {"success": True, "roadmap_id": roadmap_id, "roadmap": roadmap, "stats": calculate_roadmap_stats(roadmap)}
