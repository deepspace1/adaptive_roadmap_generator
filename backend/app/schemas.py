from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    learning_goal: str = Field(min_length=2, max_length=180)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    topic: str | None = None


class QuizSubmitRequest(BaseModel):
    topic: str
    answers: list[str]
    questions: list[dict]


class CheckAnswerSubmitRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    question: str = Field(min_length=1, max_length=500)
    answer: str = Field(min_length=1, max_length=1000)
    expected_answer_points: list[str] = Field(default_factory=list)


class ProfileUpdateRequest(BaseModel):
    learning_style: str = "balanced"
    target_subject: str = "Programming"
    daily_time_minutes: int = Field(default=30, ge=5, le=240)
    preferred_difficulty: str = "adaptive"


class SkillAssessmentQuestionsRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    level: str = Field(min_length=1, max_length=40)


class SkillAssessmentEvaluateRequest(BaseModel):
    assessment_id: str = Field(min_length=8, max_length=80)
    answers: dict[str, str]


class OnboardingSubmitRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    goal: str = Field(min_length=1, max_length=120)
    deadline: str = Field(min_length=1, max_length=80)
    skill_level: str = Field(min_length=1, max_length=40)
    prior_experience: list[str] = Field(default_factory=list)
    related_skills: str = ""
    daily_time_minutes: int = Field(default=30, ge=5, le=360)
    learning_style: str = Field(min_length=1, max_length=40)
    pace: str = Field(min_length=1, max_length=40)
    assessed_level: str = Field(min_length=1, max_length=40)


class RoadmapModuleUpdateRequest(BaseModel):
    status: str = Field(pattern="^(in_progress|completed)$")


class RoadmapRegenerateRequest(BaseModel):
    updates: dict[str, object] = Field(default_factory=dict)
