from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx


def load_env_file() -> None:
    for path in [
        Path(__file__).resolve().parents[2] / ".env",
        Path(__file__).resolve().parents[1] / ".env",
    ]:
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")
APP_NAME = os.getenv("APP_NAME", "Adaptive AI Personal Tutor")
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "25"))


def llm_configured() -> bool:
    return bool(OPENROUTER_API_KEY and OPENROUTER_MODEL)


async def chat_completion(messages: list[dict[str, str]], *, max_tokens: int = 700, temperature: float = 0.45) -> dict[str, Any] | None:
    if not llm_configured():
        return {"error": "OPENROUTER_API_KEY and OPENROUTER_MODEL must both be configured"}

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "reasoning": {"enabled": False},
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": APP_URL,
        "X-Title": APP_NAME,
    }
    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(f"{OPENROUTER_BASE_URL}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        return {"error": str(exc)}

    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        return {"error": "OpenRouter returned an empty completion"}
    return {"content": content, "usage": data.get("usage", {}), "model": data.get("model", OPENROUTER_MODEL)}
