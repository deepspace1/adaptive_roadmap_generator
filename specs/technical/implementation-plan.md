# Implementation Plan

## Phase 1: Stabilize Contracts

- Add typed tool functions in `backend/app/agents.py` or split into `backend/app/tutor_tools.py`.
- Expand `ProfileUpdateRequest` to include pace, motivation, known topics, and weak topics.
- Add database columns safely with `ALTER TABLE` checks or a lightweight migration helper.
- Add `check_results` table.
- Expand `/chat` response state with intent, next action, lesson, check question, and side panel.

## Phase 2: Better Adaptation

- Replace simple topic extraction with `detect_learning_intent`.
- Add `diagnose_learner_level` for new topics or low-evidence learners.
- Make `build_or_update_roadmap` preserve completed topics and insert requested topics with prerequisites.
- Add `select_next_teaching_action` before lesson generation.
- Add `evaluate_check_answer` and a `/check-answer/submit` endpoint.

## Phase 3: Frontend Tutor Loop

- Add a check-answer panel in chat.
- Update Zustand state for `checkQuestion`, `nextAction`, and richer side panel data.
- Display feedback after check-answer submission.
- Update quiz result display to show mastery gate and next action.

## Phase 4: Tests

Backend tests:

- Intent detection for generic, topic, quiz, answer, and review messages.
- Roadmap creation and topic insertion.
- Mastery update boundaries.
- Quiz pass/fail progression.
- Check answer partial credit.

Frontend tests:

- Empty chat starter actions.
- Active lesson side panel rendering.
- Check answer submit flow.
- Quiz result state update.

## Phase 5: LLM Upgrade Path

- Keep deterministic fallback behavior.
- Put all LLM calls behind stable tool contracts.
- Use LLM only for lesson wording, free-text answer evaluation, and resource recommendations after deterministic state is built.
- Reject off-topic LLM outputs and fall back to deterministic tutor response.

## First Coding Slice

The first implementation slice should be small:

1. Add `check_results` table.
2. Add `check_question` to `/chat` response.
3. Add `/check-answer/submit`.
4. Show a check-answer box in the frontend.
5. Update mastery after the check answer.

This slice proves the tutor can teach, ask, listen, adapt, and update mastery without waiting for a full quiz.
