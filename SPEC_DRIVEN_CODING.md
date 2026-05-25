# Spec-Driven Coding Workflow

This project should be changed by writing the intended tutor behavior first, then implementing only the smallest backend and frontend changes needed to satisfy that behavior.

## Goal

Build an adaptive AI personal tutor that customizes itself to the learner, the topic, the learner's current level, and recent performance. The tutor must teach step by step, check understanding, adapt difficulty, keep memory, and move the learner through a clear roadmap only when mastery is demonstrated.

## Non-Negotiables

- The tutor starts by understanding what the learner wants to learn.
- The tutor diagnoses level before teaching advanced material.
- The tutor teaches one small concept at a time.
- Every lesson includes an explanation, example, check question, practice step, and next action.
- The tutor adapts after every user answer, quiz, confusion signal, or topic change.
- The tutor never marks progress complete without evidence.
- The frontend must expose the learner's current topic, mastery, weak areas, and next steps.
- Tool behavior must be explicit, testable, and stable.

## Spec Order

1. Product behavior: `specs/product/adaptive-tutor-goal.md`
2. Tutor tools and tool definitions: `specs/technical/tutor-tools.md`
3. Backend API and data contracts: `specs/technical/backend-api-data.md`
4. Frontend learning experience: `specs/technical/frontend-experience.md`
5. Implementation plan: `specs/technical/implementation-plan.md`

## Coding Loop

1. Pick one acceptance criterion from a spec.
2. Write or update the contract first: schema, function signature, API shape, or UI state.
3. Implement the smallest useful change.
4. Add focused tests for the behavior.
5. Manually verify the tutor flow in the app.
6. Update the spec if the real implementation reveals a better contract.

## Definition Of Done

A change is done only when:

- The user can choose or change a topic.
- The tutor has an explicit learner profile and current learning state.
- The response is tied to the roadmap and current mastery.
- The quiz or check question can update mastery.
- Weak topics are shown and used for the next recommendation.
- The UI makes the next action obvious without needing hidden instructions.

## Out Of Scope For The First Pass

- Payment systems.
- Multi-teacher marketplace behavior.
- Long-form course authoring tools.
- Full vector database replacement before the deterministic memory contract is stable.
- Social/community features.
