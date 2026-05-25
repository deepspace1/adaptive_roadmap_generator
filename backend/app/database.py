from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


DB_PATH = Path(os.getenv("SQLITE_PATH", Path(__file__).resolve().parents[1] / "tutor.db"))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [row_to_dict(row) or {} for row in rows]


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True)


def loads(value: str | None, default: Any = None) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def init_db() -> None:
    with get_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                learning_goal TEXT NOT NULL,
                created_at TEXT NOT NULL,
                current_level TEXT DEFAULT 'Beginner'
            );

            CREATE TABLE IF NOT EXISTS refresh_tokens (
                token_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                revoked INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS student_profiles (
                student_id TEXT PRIMARY KEY,
                learning_style TEXT DEFAULT 'balanced',
                target_subject TEXT DEFAULT 'Programming',
                daily_time_minutes INTEGER DEFAULT 30,
                preferred_difficulty TEXT DEFAULT 'adaptive',
                created_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS student_mastery (
                student_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                mastery_score REAL NOT NULL,
                last_updated TEXT NOT NULL,
                PRIMARY KEY (student_id, topic),
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS quiz_results (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                score REAL NOT NULL,
                answers TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

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

            CREATE TABLE IF NOT EXISTS learning_plan (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                day INTEGER NOT NULL,
                topic TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS vector_memory (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                student_id TEXT,
                agent_name TEXT NOT NULL,
                event TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL UNIQUE,
                topic TEXT NOT NULL,
                goal TEXT NOT NULL,
                deadline TEXT NOT NULL,
                skill_level TEXT NOT NULL,
                prior_experience TEXT NOT NULL,
                related_skills TEXT NOT NULL,
                daily_time_minutes INTEGER NOT NULL,
                learning_style TEXT NOT NULL,
                pace TEXT NOT NULL,
                assessed_level TEXT,
                onboarding_completed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS roadmaps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                roadmap_json TEXT NOT NULL,
                version INTEGER DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS module_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                roadmap_id INTEGER NOT NULL,
                module_id TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                UNIQUE(user_id, roadmap_id, module_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
            );
            """
        )
