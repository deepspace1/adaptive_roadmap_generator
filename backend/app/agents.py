from __future__ import annotations

import re
import uuid
import logging
import json
import hashlib
import os
import time
from dataclasses import dataclass, field
from typing import Any

from .database import dumps, get_db, loads, now_iso, rows_to_dicts
from .llm import OPENROUTER_MODEL, chat_completion, llm_configured


logger = logging.getLogger(__name__)
ROADMAP_LLM_ATTEMPTS = max(1, int(os.getenv("ROADMAP_LLM_ATTEMPTS", "2")))
ROADMAP_MAX_TOKENS = max(1800, int(os.getenv("ROADMAP_MAX_TOKENS", "3600")))

TOPIC_LIBRARY = {
    "python": ["Variables", "Data Types", "Conditionals", "Loops", "Functions", "Lists", "Dictionaries", "Files", "Errors", "Classes"],
    "ai": ["Python Basics", "Linear Algebra", "Probability", "Data Handling", "Machine Learning", "Neural Networks", "Prompting", "Evaluation", "Deployment", "Ethics"],
    "web": ["HTML", "CSS", "JavaScript", "React", "APIs", "Databases", "Authentication", "Testing", "Deployment", "Performance"],
    "programming": ["Variables", "Control Flow", "Loops", "Functions", "Data Structures", "Algorithms", "Debugging", "OOP", "APIs", "Projects"],
}

PREREQUISITES = {
    "Recursion": ["Functions", "Call Stack", "Loops"],
    "Neural Networks": ["Linear Algebra", "Probability", "Machine Learning"],
    "React": ["JavaScript", "HTML", "CSS"],
    "Algorithms": ["Data Structures", "Loops", "Functions"],
    "Classes": ["Functions", "Dictionaries"],
}

MASTER_SYSTEM_PROMPT = """
You are the master controller for an Adaptive Multi-Agent AI Personal Tutor.
Your job is not to simply answer questions. Your job is to move the student step by step through a learning path until mastery.
Always teach from the student's current roadmap position when no clear topic is chosen.
Every turn must be structured, practical, and progression-aware:
1. Name the current roadmap step.
2. Teach only the next learnable chunk from basics to advanced.
3. Use simple language first, then a concrete example.
4. Ask exactly one reflection/check question.
5. Suggest 2-3 good next questions the learner can ask.
6. Explain when the learner should switch to the next roadmap topic.
7. Never skip ahead if prerequisites or mastery are weak.
8. Do not invent progress; rely on the state supplied by the agents.
""".strip()

AGENT_SYSTEM_PROMPTS = {
    "Planner Agent": "Owns the ordered roadmap. It must keep the learner on the next incomplete topic and expose learned/current/upcoming steps.",
    "Adaptive Planner Agent": "Owns progression decisions. It must say whether to review, practice, quiz again, or move to the next topic based on mastery.",
    "Teacher Agent": "Owns explanation quality. It must teach the smallest useful concept from first principles with one example.",
    "Socratic Agent": "Owns reflection. It must ask one precise question that reveals understanding or confusion.",
    "Quiz Agent": "Owns assessment. It must ask questions matched to mastery and the current roadmap topic.",
    "Evaluator Agent": "Owns scoring. It must update mastery and keep learners on a topic until the mastery gate is passed.",
    "Knowledge Gap Agent": "Owns missing prerequisites and weak concepts. It must identify what blocks progress.",
    "Memory Agent": "Owns durable personalization. It must preserve what was taught and what the learner struggled with.",
    "Research Agent": "Owns external resources. It must suggest focused material for the current topic only.",
    "Dashboard Agent": "Owns the visual learning state. It must show learned, current, next, weak, and mastery status clearly.",
}

GENERIC_START_MESSAGES = {
    "hi",
    "hello",
    "hey",
    "start",
    "begin",
    "continue",
    "teach me",
    "teach from basics",
    "learn",
    "i want to learn",
    "start my roadmap",
    "what next",
    "what should i ask next",
    "quiz current topic",
    "next",
}

CONTROL_TOPIC_MESSAGES = {normalize for normalize in GENERIC_START_MESSAGES}


@dataclass
class AgentState:
    student_id: str
    topic: str
    mastery_score: float
    learning_history: list[dict[str, Any]] = field(default_factory=list)
    state: dict[str, Any] = field(default_factory=dict)
    logs: list[str] = field(default_factory=list)

    def log(self, agent: str, event: str) -> None:
        self.logs.append(f"{agent}: {event}")
        with get_db() as db:
            db.execute(
                "INSERT INTO logs (id, student_id, agent_name, event, timestamp) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), self.student_id, agent, event, now_iso()),
            )

    def output(self) -> dict[str, Any]:
        return {"status": "success", "updated_state": self.state, "logs": self.logs}


def infer_subject(goal: str) -> str:
    text = goal.lower()
    if "python" in text:
        return "python"
    if "ai" in text or "machine" in text or "ml" in text:
        return "ai"
    if "web" in text or "react" in text or "frontend" in text:
        return "web"
    return "programming"


def normalize_topic(raw: str | None, fallback: str = "Variables") -> str:
    if not raw:
        return fallback
    cleaned = re.sub(r"[^a-zA-Z0-9 +#.-]", " ", raw).strip()
    if not cleaned:
        return fallback
    words = cleaned.split()
    return " ".join(word[:1].upper() + word[1:] for word in words[:4])


def is_control_topic(topic: str | None) -> bool:
    if not topic:
        return True
    normalized = re.sub(r"\s+", " ", topic.lower()).strip(" ?.!-_")
    return normalized in CONTROL_TOPIC_MESSAGES


def extract_topic(message: str, fallback: str) -> str:
    message = message.strip()
    lowered = re.sub(r"\s+", " ", message.lower()).strip(" ?.!")
    if not lowered or lowered in GENERIC_START_MESSAGES:
        return fallback
    match = re.search(r"(?:teach(?:\s+me)?|learn|explain|practice|quiz|help me with|topic is)\s+(.+)$", message, flags=re.I)
    if match:
        candidate = normalize_topic(match.group(1), fallback)
        if candidate.lower() in {"me", "this", "it", "something", "basics", "basic", "from basic", "from basics"} or is_control_topic(candidate):
            return fallback
        return candidate
    if len(message.split()) <= 3 and lowered not in {"yes", "no", "ok", "okay"} and not is_control_topic(lowered):
        candidate = normalize_topic(message, fallback)
        return fallback if is_control_topic(candidate) else candidate
    return fallback


def get_mastery(student_id: str, topic: str) -> float:
    with get_db() as db:
        row = db.execute(
            "SELECT mastery_score FROM student_mastery WHERE student_id = ? AND topic = ?",
            (student_id, topic),
        ).fetchone()
    return float(row["mastery_score"]) if row else 0.25


def last_selected_topic(student_id: str) -> str | None:
    with get_db() as db:
        rows = db.execute(
            "SELECT metadata FROM chat_messages WHERE student_id = ? AND metadata IS NOT NULL ORDER BY created_at DESC LIMIT 10",
            (student_id,),
        ).fetchall()
    for row in rows:
        topic = loads(row["metadata"], {}).get("topic")
        if topic and not is_control_topic(topic):
            return normalize_topic(topic)
    return None


def cleanup_control_topics(student_id: str) -> None:
    with get_db() as db:
        plan_rows = db.execute("SELECT topic FROM learning_plan WHERE student_id = ?", (student_id,)).fetchall()
        mastery_rows = db.execute("SELECT topic FROM student_mastery WHERE student_id = ?", (student_id,)).fetchall()
        for topic in {row["topic"] for row in plan_rows + mastery_rows if is_control_topic(row["topic"])}:
            db.execute("DELETE FROM learning_plan WHERE student_id = ? AND topic = ?", (student_id, topic))
            db.execute("DELETE FROM student_mastery WHERE student_id = ? AND topic = ?", (student_id, topic))


def ensure_topic_state(student_id: str, topic: str) -> None:
    cleanup_control_topics(student_id)
    with get_db() as db:
        row = db.execute(
            "SELECT day, status FROM learning_plan WHERE student_id = ? AND topic = ?",
            (student_id, topic),
        ).fetchone()
        if not row:
            current_day = db.execute(
                "SELECT day FROM learning_plan WHERE student_id = ? AND status = 'current' ORDER BY day LIMIT 1",
                (student_id,),
            ).fetchone()
            insert_day = current_day["day"] if current_day else db.execute(
                "SELECT COALESCE(MAX(day), 0) + 1 AS next_day FROM learning_plan WHERE student_id = ?",
                (student_id,),
            ).fetchone()["next_day"]
            db.execute(
                "UPDATE learning_plan SET day = day + 1 WHERE student_id = ? AND day >= ?",
                (student_id, insert_day),
            )
            db.execute(
                "INSERT INTO learning_plan (id, student_id, day, topic, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), student_id, insert_day, topic, "current", now_iso()),
            )
        if not row or row["status"] != "completed":
            db.execute(
                "UPDATE learning_plan SET status = 'pending' WHERE student_id = ? AND status = 'current' AND topic <> ?",
                (student_id, topic),
            )
            db.execute(
                "UPDATE learning_plan SET status = 'current' WHERE student_id = ? AND topic = ?",
                (student_id, topic),
            )
        db.execute(
            """
            INSERT INTO student_mastery (student_id, topic, mastery_score, last_updated)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(student_id, topic)
            DO UPDATE SET last_updated = excluded.last_updated
            """,
            (student_id, topic, 0.25, now_iso()),
        )


def upsert_mastery(student_id: str, topic: str, mastery: float) -> None:
    mastery = max(0.0, min(1.0, mastery))
    with get_db() as db:
        db.execute(
            """
            INSERT INTO student_mastery (student_id, topic, mastery_score, last_updated)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(student_id, topic)
            DO UPDATE SET mastery_score = excluded.mastery_score, last_updated = excluded.last_updated
            """,
            (student_id, topic, mastery, now_iso()),
        )


def build_learning_plan(student_id: str, learning_goal: str) -> list[dict[str, Any]]:
    cleanup_control_topics(student_id)
    subject = infer_subject(learning_goal)
    topics = TOPIC_LIBRARY[subject]
    with get_db() as db:
        existing = db.execute(
            "SELECT id, day, topic, status FROM learning_plan WHERE student_id = ? ORDER BY day",
            (student_id,),
        ).fetchall()
        if existing:
            return rows_to_dicts(existing)
        for index, topic in enumerate(topics, start=1):
            db.execute(
                "INSERT INTO learning_plan (id, student_id, day, topic, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), student_id, index, topic, "current" if index == 1 else "pending", now_iso()),
            )
            db.execute(
                """
                INSERT INTO student_mastery (student_id, topic, mastery_score, last_updated)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(student_id, topic)
                DO NOTHING
                """,
                (student_id, topic, 0.2 if index == 1 else 0.0, now_iso()),
            )
        rows = db.execute(
            "SELECT id, day, topic, status FROM learning_plan WHERE student_id = ? ORDER BY day",
            (student_id,),
        ).fetchall()
    return rows_to_dicts(rows)


def next_topic(student_id: str) -> str:
    with get_db() as db:
        rows = db.execute(
            "SELECT topic FROM learning_plan WHERE student_id = ? AND status IN ('current', 'pending') ORDER BY day LIMIT 1",
            (student_id,),
        ).fetchall()
    for row in rows:
        if not is_control_topic(row["topic"]):
            return row["topic"]
    return "Variables"


def current_path_state(student_id: str, topic: str) -> dict[str, Any]:
    with get_db() as db:
        plan = rows_to_dicts(
            db.execute(
                "SELECT day, topic, status FROM learning_plan WHERE student_id = ? ORDER BY day",
                (student_id,),
            ).fetchall()
        )
        mastery_rows = rows_to_dicts(
            db.execute(
                "SELECT topic, mastery_score FROM student_mastery WHERE student_id = ?",
                (student_id,),
            ).fetchall()
        )
    mastery = {item["topic"]: float(item["mastery_score"]) for item in mastery_rows}
    current_index = next((index for index, item in enumerate(plan) if item["topic"] == topic), 0)
    learned = [item["topic"] for item in plan if item["status"] == "completed"]
    upcoming = [item["topic"] for item in plan if item["status"] == "pending"][:4]
    previous_topic = plan[current_index - 1]["topic"] if current_index > 0 and plan else None
    next_item = plan[current_index + 1] if current_index + 1 < len(plan) else None
    return {
        "plan": [{**item, "mastery_score": round(mastery.get(item["topic"], 0.0), 2)} for item in plan],
        "learned": learned,
        "current": {"topic": topic, "day": plan[current_index]["day"] if plan else 1, "mastery_score": round(mastery.get(topic, 0.25), 2)},
        "previous_topic": previous_topic,
        "next_topic": next_item["topic"] if next_item else None,
        "upcoming": upcoming,
        "completed_count": len(learned),
        "total_count": len(plan),
    }


class PlannerAgent:
    name = "Planner Agent"

    def run(self, state: AgentState) -> AgentState:
        with get_db() as db:
            user = db.execute("SELECT learning_goal FROM users WHERE id = ?", (state.student_id,)).fetchone()
        plan = build_learning_plan(state.student_id, user["learning_goal"] if user else "Learn programming")
        state.state["learning_plan"] = plan
        state.state["path_state"] = current_path_state(state.student_id, state.topic)
        state.log(self.name, f"Loaded {len(plan)} roadmap items")
        return state


class AdaptivePlannerAgent:
    name = "Adaptive Planner Agent"

    def run(self, state: AgentState) -> AgentState:
        weak_topics = state.state.get("weak_topics", [])
        if weak_topics:
            state.state["next_recommendation"] = f"Review {weak_topics[0]} before moving ahead."
        elif state.mastery_score >= 0.8:
            next_topic_name = state.state.get("path_state", {}).get("next_topic")
            state.state["next_recommendation"] = (
                f"Ready to switch from {state.topic} to {next_topic_name}."
                if next_topic_name
                else f"{state.topic} is complete. Start a capstone review."
            )
        else:
            state.state["next_recommendation"] = f"Stay on {state.topic}: learn the basics, answer the check question, then complete the quiz."
        state.state["switch_criteria"] = [
            f"Score at least 80% mastery on {state.topic}.",
            "Explain the topic in your own words without copying the example.",
            "Correctly answer a new quiz question about the same idea.",
        ]
        state.log(self.name, "Updated recommendation")
        return state


class TeacherAgent:
    name = "Teacher Agent"

    def run(self, state: AgentState) -> AgentState:
        difficulty = difficulty_for_mastery(state.mastery_score)
        lesson = {
            "title": state.topic,
            "difficulty": difficulty,
            "learning_step": f"Roadmap step {state.state.get('path_state', {}).get('current', {}).get('day', 1)}: {state.topic}",
            "explanation": (
                f"Start with the basic idea of {state.topic}. Learn what it is, why it exists, and how to recognize it in a small example."
            ),
            "example": build_example(state.topic, difficulty),
            "practice_prompt": f"Explain {state.topic} in your own words, then change one detail in the example.",
            "micro_steps": build_micro_steps(state.topic),
            "keywords": build_keywords(state.topic),
        }
        state.state["lesson"] = lesson
        state.log(self.name, f"Prepared {difficulty.lower()} lesson")
        return state


class SocraticAgent:
    name = "Socratic Agent"

    def run(self, state: AgentState) -> AgentState:
        question = build_check_question(state.topic, state.mastery_score)
        state.state["reflection"] = {
            "prompt": question["question"],
            "hint": question["hint"],
        }
        state.state["check_question"] = question
        state.log(self.name, "Added reflection prompt")
        return state


class QuizAgent:
    name = "Quiz Agent"

    def run(self, state: AgentState) -> AgentState:
        difficulty = difficulty_for_mastery(state.mastery_score)
        state.state["quiz"] = generate_quiz(state.topic, difficulty)
        state.state["next_questions"] = build_next_questions(state.topic)
        state.log(self.name, f"Generated {difficulty.lower()} quiz")
        return state


class KnowledgeGapAgent:
    name = "Knowledge Gap Agent"

    def run(self, state: AgentState) -> AgentState:
        prereqs = PREREQUISITES.get(state.topic, [])
        weak = []
        for prereq in prereqs:
            if get_mastery(state.student_id, prereq) < 0.5:
                weak.append(prereq)
        if state.mastery_score < 0.5:
            weak.append(state.topic)
        state.state["weak_topics"] = sorted(set(weak))
        state.log(self.name, f"Detected {len(weak)} weak topics")
        return state


class MemoryAgent:
    name = "Memory Agent"

    def run(self, state: AgentState) -> AgentState:
        lesson = state.state.get("lesson", {})
        with get_db() as db:
            db.execute(
                "INSERT INTO vector_memory (id, student_id, topic, content, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    str(uuid.uuid4()),
                    state.student_id,
                    state.topic,
                    lesson.get("explanation", ""),
                    dumps(["lesson", lesson.get("difficulty", "adaptive")]),
                    now_iso(),
                ),
            )
        state.log(self.name, "Saved learning memory")
        return state


class ResearchAgent:
    name = "Research Agent"

    def run(self, state: AgentState) -> AgentState:
        query = state.topic.replace(" ", "+")
        state.state["resources"] = [
            {"title": f"{state.topic} practice search", "url": f"https://www.youtube.com/results?search_query={query}+tutorial"},
            {"title": f"{state.topic} docs and examples", "url": f"https://www.google.com/search?q={query}+documentation+examples"},
        ]
        state.log(self.name, "Attached external resources")
        return state


class DashboardAgent:
    name = "Dashboard Agent"

    def run(self, state: AgentState) -> AgentState:
        state.state["dashboard_snapshot"] = get_dashboard(state.student_id)
        state.state["side_panel"] = build_side_panel(state)
        state.log(self.name, "Built dashboard snapshot")
        return state


def difficulty_for_mastery(mastery: float) -> str:
    if mastery < 0.5:
        return "Easy"
    if mastery <= 0.8:
        return "Medium"
    return "Hard"


def build_keywords(topic: str) -> list[dict[str, str]]:
    topic_map = {
        "Variables": [
            {"term": "Variable", "meaning": "A name that stores a value."},
            {"term": "Value", "meaning": "The data assigned to a name."},
            {"term": "Assignment", "meaning": "Putting a value into a variable."},
        ],
        "Loops": [
            {"term": "Iteration", "meaning": "One repeat of a loop."},
            {"term": "Condition", "meaning": "The rule that decides if a loop continues."},
            {"term": "Body", "meaning": "The repeated instructions."},
        ],
        "Functions": [
            {"term": "Parameter", "meaning": "Input a function receives."},
            {"term": "Return", "meaning": "Output a function gives back."},
            {"term": "Call", "meaning": "Running the function."},
        ],
        "Recursion": [
            {"term": "Base case", "meaning": "The condition that stops recursion."},
            {"term": "Recursive case", "meaning": "The step that calls the same function again."},
            {"term": "Call stack", "meaning": "The waiting line of function calls."},
        ],
        "Neural Networks": [
            {"term": "Neuron", "meaning": "A small unit that transforms inputs."},
            {"term": "Weight", "meaning": "A learned strength on an input."},
            {"term": "Loss", "meaning": "How wrong the prediction is."},
        ],
    }
    return topic_map.get(
        topic,
        [
            {"term": topic, "meaning": f"The current concept in your roadmap."},
            {"term": "Example", "meaning": "A small case you can trace."},
            {"term": "Mastery", "meaning": "Proof that you can explain and apply it."},
        ],
    )


def build_micro_steps(topic: str) -> list[str]:
    return [
        f"Understand what {topic} means in plain language.",
        f"See one small example of {topic}.",
        f"Explain why the example works.",
        f"Answer a quick check question about {topic}.",
        "Take the quiz and reach 80% mastery to unlock the next roadmap topic.",
    ]


def build_next_questions(topic: str) -> list[str]:
    return [
        f"Can you explain {topic} with an easier example?",
        f"What mistakes do beginners make in {topic}?",
        f"Give me a practice problem for {topic}.",
    ]


def build_check_question(topic: str, mastery: float) -> dict[str, Any]:
    difficulty = difficulty_for_mastery(mastery)
    expected_points = expected_points_for_topic(topic)
    if difficulty == "Hard":
        question = f"How would you apply {topic} to a new example, and what edge case would you check?"
    elif difficulty == "Medium":
        question = f"Explain {topic} using the example, then say why each step works."
    else:
        question = f"In your own words, what is {topic} used for?"
    return {
        "topic": topic,
        "difficulty": difficulty,
        "question": question,
        "expected_answer_points": expected_points,
        "hint": f"Use plain words and include at least one idea like: {', '.join(expected_points[:2])}.",
    }


def expected_points_for_topic(topic: str) -> list[str]:
    topic_map = {
        "Variables": ["store a value", "name", "reuse or change later"],
        "Loops": ["repeat", "block of steps", "condition or sequence"],
        "Functions": ["named reusable steps", "input", "return output"],
        "Lists": ["ordered collection", "multiple values", "index"],
        "Dictionaries": ["key", "value", "lookup"],
        "Recursion": ["base case", "smaller problem", "function calls itself"],
        "React": ["component", "state", "render UI"],
        "Neural Networks": ["inputs", "weights", "prediction or loss"],
    }
    return topic_map.get(topic, [topic.lower(), "purpose", "small example"])


def build_side_panel(state: AgentState) -> dict[str, Any]:
    lesson = state.state.get("lesson", {})
    path_state = state.state.get("path_state", {})
    return {
        "current_step": path_state.get("current", {"topic": state.topic, "day": 1, "mastery_score": state.mastery_score}),
        "learned": path_state.get("learned", []),
        "upcoming": path_state.get("upcoming", []),
        "next_topic": path_state.get("next_topic"),
        "progress_label": f"{path_state.get('completed_count', 0)} / {path_state.get('total_count', 0)} topics complete",
        "keywords": lesson.get("keywords", []),
        "micro_steps": lesson.get("micro_steps", build_micro_steps(state.topic)),
        "next_questions": state.state.get("next_questions", build_next_questions(state.topic)),
        "switch_criteria": state.state.get("switch_criteria", []),
        "recommendation": state.state.get("next_recommendation", f"Keep practicing {state.topic}."),
        "weak_topics": state.state.get("weak_topics", []),
    }


def build_example(topic: str, difficulty: str) -> str:
    examples = {
        "Variables": "Think of `score = 10` as naming a value so you can reuse and update it later.",
        "Loops": "A loop repeats a block: `for item in items:` lets you handle each item one at a time.",
        "Functions": "`def double(x): return x * 2` packages a repeatable idea behind a name.",
        "Recursion": "A recursive function solves a smaller version of the same problem until it reaches a base case.",
        "React": "A component turns state into UI, then re-renders when that state changes.",
    }
    base = examples.get(topic, f"Create a tiny example of {topic}, predict the output, then run or mentally trace it.")
    if difficulty == "Hard":
        return f"{base} Now add a constraint, edge case, or performance question."
    if difficulty == "Medium":
        return f"{base} Then explain why each step happens."
    return base


def generate_quiz(topic: str, difficulty: str) -> dict[str, Any]:
    return {
        "topic": topic,
        "difficulty": difficulty,
        "questions": [
            {
                "question": f"What is the main purpose of {topic}?",
                "options": [
                    "To solve or organize a specific learning problem",
                    "To make code longer",
                    "To avoid testing ideas",
                    "To replace all other concepts",
                ],
                "answer": "To solve or organize a specific learning problem",
            },
            {
                "question": f"When practicing {topic}, what should you do first?",
                "options": [
                    "Start with a small example",
                    "Memorize every edge case",
                    "Skip feedback",
                    "Only read theory",
                ],
                "answer": "Start with a small example",
            },
            {
                "question": f"How do you know your understanding of {topic} is improving?",
                "options": [
                    "You can explain it and apply it to a new example",
                    "You never make mistakes",
                    "You stop practicing",
                    "You only recognize the word",
                ],
                "answer": "You can explain it and apply it to a new example",
            },
        ],
    }


def extract_json_object(content: str) -> dict[str, Any]:
    try:
        value = json.loads(content)
        if isinstance(value, dict):
            return value
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", content, flags=re.S)
    if not match:
        raise ValueError("LLM response did not contain a JSON object")
    value = json.loads(match.group(0))
    if not isinstance(value, dict):
        raise ValueError("LLM response JSON was not an object")
    return value


def validate_roadmap(roadmap: dict[str, Any]) -> dict[str, Any]:
    required = {"topic", "user_level", "total_duration_weeks", "weekly_hours_commitment", "summary", "phases", "milestones", "next_suggested_module"}
    missing = required.difference(roadmap)
    if missing:
        raise ValueError(f"Roadmap is missing required keys: {', '.join(sorted(missing))}")
    if not isinstance(roadmap["phases"], list) or not roadmap["phases"]:
        raise ValueError("Roadmap must include phases")
    if not isinstance(roadmap["milestones"], list):
        raise ValueError("Roadmap milestones must be a list")
    module_ids = set()
    module_titles = set()
    resource_titles = set()
    first_module_seen = False
    for phase_index, phase in enumerate(roadmap["phases"], start=1):
        for key in ["phase_number", "phase_title", "phase_goal", "duration_weeks", "color", "modules"]:
            if key not in phase:
                raise ValueError(f"Phase {phase_index} is missing {key}")
        if not isinstance(phase["modules"], list) or not phase["modules"]:
            raise ValueError(f"Phase {phase_index} must include modules")
        for module in phase["modules"]:
            for key in ["module_id", "title", "description", "estimated_hours", "difficulty", "skills_taught", "prerequisites", "resources", "mastery_criteria", "practice_project", "status"]:
                if key not in module:
                    raise ValueError(f"Module is missing {key}")
            title_key = re.sub(r"\W+", " ", str(module["title"]).lower()).strip()
            if title_key in module_titles:
                raise ValueError(f"Duplicate module title: {module['title']}")
            module_titles.add(title_key)
            if not isinstance(module.get("resources"), list) or len(module["resources"]) < 2:
                raise ValueError(f"Module {module['module_id']} must include at least 2 resources")
            for resource in module["resources"]:
                resource_key = re.sub(r"\W+", " ", str(resource.get("title", "")).lower()).strip()
                if resource_key in resource_titles:
                    raise ValueError(f"Duplicate resource title: {resource.get('title')}")
                resource_titles.add(resource_key)
            module_ids.add(str(module["module_id"]))
            if not first_module_seen:
                module["status"] = "available"
                first_module_seen = True
            elif module.get("status") not in {"available", "locked", "in_progress", "completed"}:
                module["status"] = "locked"
    if roadmap["next_suggested_module"] not in module_ids:
        roadmap["next_suggested_module"] = next(iter(module_ids))
    return roadmap


def roadmap_fingerprint(profile: dict[str, Any]) -> str:
    identity = {
        "learner": profile.get("learner_fingerprint") or profile.get("user_id") or profile.get("id") or "",
        "topic": profile.get("topic") or "",
        "goal": profile.get("goal") or "",
        "deadline": profile.get("deadline") or "",
        "skill_level": profile.get("skill_level") or "",
        "assessed_level": profile.get("assessed_level") or "",
        "prior_experience": profile.get("prior_experience") or [],
        "related_skills": profile.get("related_skills") or "",
        "daily_time_minutes": profile.get("daily_time_minutes") or "",
        "learning_style": profile.get("learning_style") or "",
        "pace": profile.get("pace") or "",
    }
    return hashlib.sha256(json.dumps(identity, sort_keys=True, ensure_ascii=True).encode("utf-8")).hexdigest()


async def generate_roadmap(profile: dict[str, Any]) -> dict[str, Any]:
    if not llm_configured():
        raise ValueError(
            "OPENROUTER_API_KEY and OPENROUTER_MODEL must both be configured. "
            "Roadmap generation is LLM-only and local template fallback is disabled."
        )
    prior_experience = profile.get("prior_experience", [])
    if isinstance(prior_experience, str):
        prior_experience_text = prior_experience
    else:
        prior_experience_text = ", ".join(str(item) for item in prior_experience) or "None"
    fingerprint = roadmap_fingerprint(profile)
    system = (
        "You are an expert curriculum designer and learning path architect. "
        "You create highly personalized, detailed, and actionable learning roadmaps. "
        "Always return valid JSON only, no markdown, no explanation. "
        "Never produce the same roadmap for two different learners, even if they choose the same topic."
    )
    user_prompt = f"""
Create a comprehensive learning roadmap for the following learner profile:

- Topic to master: {profile.get("topic")}
- Their goal: {profile.get("goal")}
- Deadline: {profile.get("deadline")}
- Self-assessed level: {profile.get("skill_level")}
- AI-assessed level: {profile.get("assessed_level")}
- Prior experience: {prior_experience_text}
- Related skills: {profile.get("related_skills")}
- Daily time available: {profile.get("daily_time_minutes")} minutes
- Learning style preference: {profile.get("learning_style")}
- Preferred pace: {profile.get("pace")}
- Unique learner roadmap fingerprint: {fingerprint}

Personalization requirement:
- This fingerprint is a uniqueness constraint. Use it to vary phase emphasis, module order, project choices, examples, resources, milestones, and wording.
- Two learners with the same topic must still receive visibly different roadmap JSON.
- Do not mention the fingerprint in user-facing titles or descriptions.

Return ONLY a JSON object with this exact structure:
{{
  "topic": string,
  "user_level": string,
  "total_duration_weeks": number,
  "weekly_hours_commitment": number,
  "summary": string,
  "phases": [
    {{
      "phase_number": number,
      "phase_title": string,
      "phase_goal": string,
      "duration_weeks": number,
      "color": string,
      "modules": [
        {{
          "module_id": string,
          "title": string,
          "description": string,
          "estimated_hours": number,
          "difficulty": "easy" | "medium" | "hard",
          "skills_taught": string[],
          "prerequisites": string[],
          "resources": [
            {{
              "type": "video" | "article" | "book" | "project" | "quiz",
              "title": string,
              "description": string
            }}
          ],
          "mastery_criteria": string,
          "practice_project": string | null,
          "status": "available" | "locked"
        }}
      ]
    }}
  ],
  "milestones": [
    {{
      "id": string,
      "title": string,
      "description": string,
      "target_week": number,
      "badge_emoji": string,
      "required_module_ids": string[]
    }}
  ],
  "next_suggested_module": string
}}

Rules:
- Generate between 3-5 phases based on complexity
- Each phase should have 3-6 modules
- First module of phase 1 must have status "available", all others start "locked"
- Tailor depth/breadth to the assessed_level
- If deadline is tight, reduce total_duration_weeks accordingly
- Module titles must be concrete curriculum topics, not generic labels. Bad: "Core concepts", "Essential tools", "Worked examples". Good for stock market: "Market Structure and Participants", "Risk, Return, and Position Sizing", "Valuation: Multiples and DCF".
- Every module title must be unique across the whole roadmap.
- Every phase must represent a distinct progression stage with a specific phase_goal.
- Resources must be realistic, specific, and unique. Do not reuse the same resource titles across modules.
- Each module needs 2-4 resources, and at least one resource must be an applied project, drill, worksheet, case study, or quiz.
- skills_taught must contain specific skills, not the broad topic name repeated.
- practice_project must be specific and outcome-based when present.
- Milestones should feel like real achievements with concrete required_module_ids.
""".strip()
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user_prompt}]
    started_at = time.perf_counter()
    for attempt in range(ROADMAP_LLM_ATTEMPTS):
        attempt_started_at = time.perf_counter()
        logger.info(
            "Roadmap LLM attempt %s/%s for topic=%s model=%s",
            attempt + 1,
            ROADMAP_LLM_ATTEMPTS,
            profile.get("topic"),
            OPENROUTER_MODEL,
        )
        result = await chat_completion(messages, max_tokens=ROADMAP_MAX_TOKENS, temperature=0.35 if attempt == 0 else 0.1)
        elapsed = time.perf_counter() - attempt_started_at
        logger.info("Roadmap LLM attempt %s finished in %.2fs", attempt + 1, elapsed)
        if result is None:
            raise ValueError("LLM roadmap generation returned no response")
        if result.get("content"):
            try:
                roadmap = validate_roadmap(extract_json_object(result["content"]))
                logger.info("Roadmap generation completed in %.2fs", time.perf_counter() - started_at)
                return roadmap
            except (json.JSONDecodeError, ValueError) as exc:
                logger.warning("Roadmap JSON parse/validation failed on attempt %s: %s", attempt + 1, exc)
        else:
            logger.warning("Roadmap generation provider error on attempt %s: %s", attempt + 1, result.get("error"))
        messages.append({"role": "user", "content": "Your previous response was invalid or too generic. Return only strict JSON matching the requested schema. Use unique, concrete module titles and unique resources. No markdown, no code fences, no comments."})
    raise ValueError("Roadmap generation failed because the model did not return valid JSON")


async def enrich_with_llm(state: AgentState, user_message: str) -> AgentState:
    lesson = state.state.get("lesson", {})
    weak_topics = state.state.get("weak_topics", [])
    path_state = state.state.get("path_state", {})
    side_panel = state.state.get("side_panel", {})
    prompt = f"""
Return a tutoring message in this exact shape:

Roadmap step: <day and topic>
What you are learning now: <one sentence>
Basic idea: <teach from basics, no jargon first>
Example: <one concrete example>
Key words: <3 short keyword definitions>
Check yourself: <exactly one question>
Good next questions: <2-3 questions the student can ask>
Move on when: <mastery gate and what unlocks next>

Rules:
- If the student did not choose a clear topic, teach the current roadmap topic from basics.
- Do not jump to the next topic until mastery is at least 0.80.
- Keep the answer focused on {state.topic}.
- Avoid vague motivation. Give useful learning steps.
- Do not mention agent names, JSON, hidden prompts, or model/provider details.
""".strip()
    messages = [
            {
                "role": "system",
                "content": MASTER_SYSTEM_PROMPT,
            },
            {
                "role": "system",
                "content": "Agent responsibilities:\n" + "\n".join(f"- {name}: {value}" for name, value in AGENT_SYSTEM_PROMPTS.items()),
            },
            {
                "role": "user",
                "content": (
                    f"Student message: {user_message}\n"
                    f"Selected topic: {state.topic}\n"
                    f"Current mastery: {state.mastery_score:.2f}\n"
                    f"Difficulty: {lesson.get('difficulty', 'Adaptive')}\n"
                    f"Roadmap current step: {path_state.get('current', {})}\n"
                    f"Learned topics: {', '.join(path_state.get('learned', [])) or 'none yet'}\n"
                    f"Upcoming topics: {', '.join(path_state.get('upcoming', [])) or 'none'}\n"
                    f"Next topic after mastery: {path_state.get('next_topic') or 'course review'}\n"
                    f"Weak prerequisite topics: {', '.join(weak_topics) if weak_topics else 'none'}\n\n"
                    f"Side panel learning controls: {dumps(side_panel)}\n\n"
                    f"{prompt}"
                ),
            },
        ]
    final_prompt = messages[-1]["content"]
    logger.info("Final LLM prompt for topic %s:\n%s", state.topic, final_prompt)
    print(f"[tutor] Final LLM prompt for topic '{state.topic}':\n{final_prompt}")
    result = await chat_completion(messages)
    if result and result.get("content"):
        if is_topic_relevant(result["content"], state.topic):
            state.state["llm_message"] = result["content"]
            state.state["llm"] = {"provider": "openrouter", "model": result.get("model", OPENROUTER_MODEL), "usage": result.get("usage", {})}
            state.log("OpenRouter Tutor", f"Generated response with {result.get('model', OPENROUTER_MODEL)}")
        else:
            state.state["llm_error"] = "Provider response did not mention the selected topic."
            state.log("OpenRouter Tutor", "Used fallback because provider response was off-topic")
    elif result and result.get("error"):
        state.state["llm_error"] = result["error"]
        state.log("OpenRouter Tutor", "Used fallback after provider error")
    else:
        state.log("OpenRouter Tutor", "Used fallback because OPENROUTER_API_KEY is not set")
    return state


def is_topic_relevant(content: str, topic: str) -> bool:
    terms = [term.lower() for term in re.split(r"\W+", topic) if len(term) >= 3]
    if not terms:
        return True
    lowered = content.lower()
    return any(term in lowered for term in terms)


def dashboard_current_topic(messages: list[dict[str, Any]], plan: list[dict[str, Any]], mastery: list[dict[str, Any]]) -> str | None:
    for message in messages:
        topic = loads(message.get("metadata"), {}).get("topic")
        if topic:
            return normalize_topic(topic)
    current = next((item["topic"] for item in plan if item.get("status") == "current"), None)
    if current:
        return current
    return mastery[0]["topic"] if mastery else None


async def run_tutor_loop(student_id: str, message: str, requested_topic: str | None = None) -> dict[str, Any]:
    requested_topic = None if is_control_topic(requested_topic) else requested_topic
    fallback = normalize_topic(requested_topic) if requested_topic else last_selected_topic(student_id) or next_topic(student_id)
    topic = extract_topic(message, fallback)
    logger.info("Selected topic: %s", topic)
    print(f"[tutor] Selected topic: {topic}")
    ensure_topic_state(student_id, topic)
    mastery = get_mastery(student_id, topic)
    state = AgentState(student_id=student_id, topic=topic, mastery_score=mastery)
    for agent in [
        PlannerAgent(),
        KnowledgeGapAgent(),
        TeacherAgent(),
        SocraticAgent(),
        QuizAgent(),
        AdaptivePlannerAgent(),
        ResearchAgent(),
        MemoryAgent(),
        DashboardAgent(),
    ]:
        state = agent.run(state)
    state = await enrich_with_llm(state, message)
    assistant_message = format_tutor_message(state)
    with get_db() as db:
        db.execute(
            "INSERT INTO chat_messages (id, student_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), student_id, "user", message, dumps({"topic": topic}), now_iso()),
        )
        db.execute(
            "INSERT INTO chat_messages (id, student_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), student_id, "assistant", assistant_message, dumps(state.state), now_iso()),
        )
    return {"message": assistant_message, **state.output()}


def format_tutor_message(state: AgentState) -> str:
    if state.state.get("llm_message"):
        return state.state["llm_message"]
    lesson = state.state["lesson"]
    side_panel = state.state.get("side_panel", {})
    check_question = state.state.get("check_question", {})
    keywords = lesson.get("keywords", [])
    keyword_line = "; ".join(f"{item['term']}: {item['meaning']}" for item in keywords)
    next_questions = "\n".join(f"- {question}" for question in side_panel.get("next_questions", []))
    switch_rules = "\n".join(f"- {rule}" for rule in side_panel.get("switch_criteria", []))
    return (
        f"Roadmap step: {lesson.get('learning_step', lesson['title'])}\n\n"
        f"What you are learning now: {lesson['title']} at a {lesson['difficulty']} level.\n\n"
        f"Basic idea: {lesson['explanation']}\n\n"
        f"Example: {lesson['example']}\n\n"
        f"Key words: {keyword_line}\n\n"
        f"Check yourself: {check_question.get('question', state.state.get('reflection', {}).get('prompt', lesson['practice_prompt']))}\n\n"
        f"Practice task: {lesson['practice_prompt']}\n\n"
        f"Good next questions:\n{next_questions}\n\n"
        f"Move on when:\n{switch_rules}"
    )


def tokenize_answer(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-zA-Z0-9]+", text.lower()) if len(token) > 2}


def score_expected_points(answer: str, expected_points: list[str]) -> tuple[float, list[str]]:
    if not expected_points:
        expected_points = ["purpose", "example"]
    answer_tokens = tokenize_answer(answer)
    matched = 0
    missing = []
    for point in expected_points:
        point_tokens = tokenize_answer(point)
        if point_tokens and answer_tokens.intersection(point_tokens):
            matched += 1
        else:
            missing.append(point)
    return matched / max(len(expected_points), 1), missing


def next_action_for_check(score: float, mastery: float) -> str:
    if mastery >= 0.8 and score >= 0.67:
        return "quiz"
    if score >= 0.67:
        return "practice"
    return "review"


def evaluate_check_answer(student_id: str, topic: str, question: str, answer: str, expected_answer_points: list[str]) -> dict[str, Any]:
    expected_answer_points = expected_answer_points or expected_points_for_topic(topic)
    score, missing = score_expected_points(answer, expected_answer_points)
    previous = get_mastery(student_id, topic)
    if score >= 0.8:
        delta = 0.08
    elif score >= 0.5:
        delta = 0.04
    elif score >= 0.25:
        delta = 0.0
    else:
        delta = -0.04
    mastery = round(max(0.0, min(1.0, previous + delta)), 2)
    next_action = next_action_for_check(score, mastery)
    if score >= 0.8:
        feedback = f"Strong answer. You connected the key idea for {topic}, so mastery moved up."
    elif score >= 0.5:
        feedback = f"Good start. Add the missing idea about {missing[0] if missing else topic} before moving on."
    else:
        feedback = f"Let's slow down on {topic}. Review the basic idea, then try a smaller example."
    upsert_mastery(student_id, topic, mastery)
    with get_db() as db:
        db.execute(
            "INSERT INTO check_results (id, student_id, topic, question, answer, score, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), student_id, topic, question, answer, round(score, 2), feedback, now_iso()),
        )
    return {
        "score": round(score, 2),
        "mastery_score": mastery,
        "feedback": feedback,
        "missing_points": missing,
        "next_action": next_action,
    }


def evaluate_quiz(student_id: str, topic: str, answers: list[str], questions: list[dict[str, Any]]) -> dict[str, Any]:
    total = max(len(questions), 1)
    correct = 0
    detail = []
    for index, question in enumerate(questions):
        selected = answers[index] if index < len(answers) else ""
        answer = question.get("answer")
        is_correct = selected == answer
        correct += 1 if is_correct else 0
        detail.append({"question": question.get("question"), "selected": selected, "answer": answer, "correct": is_correct})
    quiz_score = correct / total
    previous = get_mastery(student_id, topic)
    consistency = min(1.0, previous + 0.1)
    speed = 0.75
    mastery = (quiz_score * 0.6) + (consistency * 0.2) + (speed * 0.2)
    mastery = round((previous * 0.35) + (mastery * 0.65), 2)
    upsert_mastery(student_id, topic, mastery)
    with get_db() as db:
        db.execute(
            "INSERT INTO quiz_results (id, student_id, topic, score, answers, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), student_id, topic, quiz_score, dumps(detail), now_iso()),
        )
        if mastery >= 0.8:
            db.execute("UPDATE learning_plan SET status = 'completed' WHERE student_id = ? AND topic = ?", (student_id, topic))
            db.execute(
                """
                UPDATE learning_plan
                SET status = 'current'
                WHERE id = (
                    SELECT id FROM learning_plan
                    WHERE student_id = ? AND status = 'pending'
                    ORDER BY day LIMIT 1
                )
                """,
                (student_id,),
            )
    return {"score": round(quiz_score, 2), "mastery_score": mastery, "details": detail}


def get_dashboard(student_id: str) -> dict[str, Any]:
    with get_db() as db:
        mastery = rows_to_dicts(
            db.execute(
                "SELECT topic, mastery_score, last_updated FROM student_mastery WHERE student_id = ? ORDER BY last_updated DESC",
                (student_id,),
            ).fetchall()
        )
        quizzes = rows_to_dicts(
            db.execute(
                "SELECT topic, score, created_at FROM quiz_results WHERE student_id = ? ORDER BY created_at ASC",
                (student_id,),
            ).fetchall()
        )
        plan = rows_to_dicts(
            db.execute(
                "SELECT day, topic, status FROM learning_plan WHERE student_id = ? ORDER BY day",
                (student_id,),
            ).fetchall()
        )
        messages = rows_to_dicts(
            db.execute(
                "SELECT role, content, metadata, created_at FROM chat_messages WHERE student_id = ? ORDER BY created_at DESC LIMIT 20",
                (student_id,),
            ).fetchall()
        )
    weak_topics = [item["topic"] for item in mastery if float(item["mastery_score"]) < 0.5]
    avg_mastery = round(sum(float(item["mastery_score"]) for item in mastery) / max(len(mastery), 1), 2)
    avg_accuracy = round(sum(float(item["score"]) for item in quizzes) / max(len(quizzes), 1), 2)
    completed = len([item for item in plan if item["status"] == "completed"])
    current_topic = dashboard_current_topic(messages, plan, mastery)
    return {
        "current_topic": current_topic,
        "mastery": mastery,
        "quizzes": quizzes,
        "plan": plan,
        "weak_topics": weak_topics,
        "messages": [{**msg, "metadata": loads(msg.get("metadata"), {})} for msg in messages],
        "stats": {
            "topics_learned": completed,
            "average_mastery": avg_mastery,
            "quiz_accuracy": avg_accuracy,
            "learning_streak": min(7, max(1, len(quizzes))),
        },
    }
