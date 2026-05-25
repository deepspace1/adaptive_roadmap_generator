# Tutor Tools Specification

This file defines the tutor tools the agent loop should expose internally. A "tool" can be a Python function, service class, LLM-call wrapper, or deterministic node. Each tool must have a stable input and output shape so the tutor can be tested.

## Shared Types

### `LearnerContext`

```json
{
  "student_id": "string",
  "goal": "string",
  "target_subject": "string",
  "current_level": "beginner | intermediate | advanced | unknown",
  "learning_style": "balanced | visual | example_first | socratic | project_based | concise",
  "preferred_difficulty": "adaptive | easy | medium | hard",
  "daily_time_minutes": 30,
  "pace": "slow | normal | fast",
  "known_topics": ["string"],
  "weak_topics": ["string"]
}
```

### `LearningState`

```json
{
  "topic": "string",
  "roadmap_step": 1,
  "mastery_score": 0.25,
  "status": "new | learning | practicing | ready_for_quiz | completed",
  "last_user_message": "string",
  "recent_results": []
}
```

### `ToolResult`

```json
{
  "status": "success | needs_input | error",
  "data": {},
  "events": ["string"]
}
```

## Tool Definitions

### 1. `detect_learning_intent`

Purpose: Understand what the learner is trying to do in the current message.

Input:

```json
{
  "message": "string",
  "current_topic": "string | null"
}
```

Output:

```json
{
  "intent": "start | continue | learn_topic | ask_question | answer_check | request_quiz | submit_quiz | change_goal | review | unknown",
  "topic": "string | null",
  "confidence": 0.0,
  "needs_clarification": false
}
```

Behavior:

- Detect direct topic requests like "teach me loops".
- Treat generic messages like "continue" as current-roadmap continuation.
- Mark vague new-user messages as `needs_clarification`.

### 2. `load_learner_profile`

Purpose: Fetch durable personalization data.

Input:

```json
{ "student_id": "string" }
```

Output:

```json
{
  "profile": "LearnerContext",
  "missing_fields": ["string"]
}
```

Behavior:

- Pull from `users`, `student_profiles`, mastery, quiz history, and memory.
- Return missing fields so onboarding can ask only useful questions.

### 3. `diagnose_learner_level`

Purpose: Estimate starting level for a subject or topic.

Input:

```json
{
  "profile": "LearnerContext",
  "topic": "string",
  "message": "string",
  "quiz_history": []
}
```

Output:

```json
{
  "estimated_level": "beginner | intermediate | advanced",
  "evidence": ["string"],
  "recommended_start_topic": "string",
  "diagnostic_question": "string | null"
}
```

Behavior:

- Use existing mastery first.
- If there is not enough evidence, produce one diagnostic question.
- Never assume advanced level from ambition alone.

### 4. `build_or_update_roadmap`

Purpose: Create or adjust an ordered learning path.

Input:

```json
{
  "student_id": "string",
  "goal": "string",
  "target_subject": "string",
  "current_topic": "string | null",
  "known_topics": ["string"],
  "weak_topics": ["string"]
}
```

Output:

```json
{
  "plan": [
    {
      "day": 1,
      "topic": "string",
      "status": "current | pending | completed | review",
      "mastery_score": 0.0
    }
  ],
  "current_step": {}
}
```

Behavior:

- Preserve completed topics.
- Insert user-requested topics at the nearest sensible position.
- Add prerequisites before advanced topics.

### 5. `select_next_teaching_action`

Purpose: Decide what the tutor should do next.

Input:

```json
{
  "profile": "LearnerContext",
  "state": "LearningState",
  "intent": "string",
  "weak_topics": ["string"]
}
```

Output:

```json
{
  "action": "ask_onboarding | diagnose | teach | review | practice | quiz | evaluate | move_next",
  "reason": "string",
  "difficulty": "easy | medium | hard",
  "topic": "string"
}
```

Behavior:

- Choose `ask_onboarding` if the profile lacks the minimum goal/topic information.
- Choose `review` when prerequisites are weak.
- Choose `move_next` only when mastery is at least `0.80`.

### 6. `generate_lesson`

Purpose: Produce a small teachable lesson.

Input:

```json
{
  "profile": "LearnerContext",
  "topic": "string",
  "difficulty": "easy | medium | hard",
  "roadmap_step": 1,
  "weak_topics": ["string"]
}
```

Output:

```json
{
  "title": "string",
  "why_it_matters": "string",
  "explanation": "string",
  "example": "string",
  "keywords": [{"term": "string", "meaning": "string"}],
  "micro_steps": ["string"],
  "practice_task": "string"
}
```

Behavior:

- Teach one concept, not a whole chapter.
- Match learning style and difficulty.
- Use plain language before jargon.

### 7. `ask_check_question`

Purpose: Ask exactly one question to reveal understanding.

Input:

```json
{
  "topic": "string",
  "difficulty": "easy | medium | hard",
  "lesson": {}
}
```

Output:

```json
{
  "question": "string",
  "expected_answer_points": ["string"],
  "hint": "string"
}
```

Behavior:

- Ask one focused question.
- Prefer explanation or prediction questions over trivia.

### 8. `evaluate_check_answer`

Purpose: Score a free-text learner answer to the check question.

Input:

```json
{
  "student_id": "string",
  "topic": "string",
  "question": "string",
  "answer": "string",
  "expected_answer_points": ["string"]
}
```

Output:

```json
{
  "score": 0.0,
  "feedback": "string",
  "missing_points": ["string"],
  "mastery_delta": 0.0,
  "next_action": "review | practice | quiz | continue"
}
```

Behavior:

- Give credit for partial understanding.
- Update mastery only with evidence.
- Use feedback to decide the next action.

### 9. `generate_adaptive_quiz`

Purpose: Create a quiz matched to current mastery.

Input:

```json
{
  "topic": "string",
  "difficulty": "easy | medium | hard",
  "mastery_score": 0.0,
  "weak_topics": ["string"]
}
```

Output:

```json
{
  "topic": "string",
  "difficulty": "string",
  "questions": [
    {
      "id": "string",
      "type": "multiple_choice | short_answer",
      "question": "string",
      "options": ["string"],
      "answer": "string",
      "rubric": ["string"]
    }
  ]
}
```

Behavior:

- Use easier questions below `0.50` mastery.
- Include application questions above `0.80` mastery.
- Keep question count short enough for chat.

### 10. `evaluate_quiz_submission`

Purpose: Score submitted quiz answers and update mastery.

Input:

```json
{
  "student_id": "string",
  "topic": "string",
  "answers": ["string"],
  "questions": []
}
```

Output:

```json
{
  "score": 0.0,
  "mastery_score": 0.0,
  "details": [],
  "passed_mastery_gate": false,
  "next_action": "review | practice | move_next"
}
```

Behavior:

- Store quiz result.
- Mark topic complete only when mastery is at least `0.80`.
- Move the next pending roadmap topic to current after completion.

### 11. `detect_knowledge_gaps`

Purpose: Identify blockers and weak prerequisites.

Input:

```json
{
  "student_id": "string",
  "topic": "string",
  "mastery": {},
  "recent_answers": []
}
```

Output:

```json
{
  "weak_topics": ["string"],
  "missing_prerequisites": ["string"],
  "review_plan": ["string"]
}
```

Behavior:

- Check prerequisite map first.
- Use wrong quiz answers and weak check answers as evidence.

### 12. `save_learning_memory`

Purpose: Store useful long-term learning context.

Input:

```json
{
  "student_id": "string",
  "topic": "string",
  "memory_type": "lesson | mistake | preference | achievement",
  "content": "string",
  "tags": ["string"]
}
```

Output:

```json
{ "saved": true, "memory_id": "string" }
```

Behavior:

- Store only useful tutor memory, not every token.
- Tag mistakes and preferences for later adaptation.

### 13. `recommend_resources`

Purpose: Suggest focused resources for the current topic.

Input:

```json
{
  "topic": "string",
  "level": "beginner | intermediate | advanced",
  "learning_style": "string"
}
```

Output:

```json
{
  "resources": [
    {
      "title": "string",
      "url": "string",
      "reason": "string"
    }
  ]
}
```

Behavior:

- Recommend only current-topic resources.
- Prefer official docs and high-quality practice sources.

### 14. `build_learning_dashboard`

Purpose: Create UI-ready learning state.

Input:

```json
{ "student_id": "string" }
```

Output:

```json
{
  "current_topic": "string",
  "mastery": [],
  "quizzes": [],
  "plan": [],
  "weak_topics": [],
  "stats": {}
}
```

Behavior:

- Keep the frontend simple.
- Include all current, learned, next, weak, and mastery data.

### 15. `compose_tutor_response`

Purpose: Convert tool results into the final user-facing answer.

Input:

```json
{
  "profile": "LearnerContext",
  "state": "LearningState",
  "lesson": {},
  "check_question": {},
  "recommendation": {},
  "dashboard_snapshot": {}
}
```

Output:

```json
{
  "message": "string",
  "side_panel": {},
  "quiz": {},
  "next_questions": ["string"]
}
```

Behavior:

- Do not mention internal tool names.
- Follow the response contract from the product spec.
- Make the next learner action obvious.

## Mapping To Current Code

- `backend/app/agents.py::extract_topic` maps to `detect_learning_intent`.
- `build_learning_plan` maps to `build_or_update_roadmap`.
- `PlannerAgent`, `AdaptivePlannerAgent`, and `KnowledgeGapAgent` should become clearer wrappers around the roadmap/action/gap tools.
- `TeacherAgent` maps to `generate_lesson`.
- `SocraticAgent` maps to `ask_check_question`.
- `QuizAgent` maps to `generate_adaptive_quiz`.
- `evaluate_quiz` maps to `evaluate_quiz_submission`.
- `MemoryAgent` maps to `save_learning_memory`.
- `DashboardAgent` and `get_dashboard` map to `build_learning_dashboard`.
- `format_tutor_message` and `enrich_with_llm` map to `compose_tutor_response`.
