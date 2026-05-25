# Frontend Learning Experience Specification

## Current Stack

- Next.js App Router in `frontend/app`.
- Zustand tutor store in `frontend/store/tutor.ts`.
- Chat UI in `frontend/app/chat/page.tsx`.
- Quiz UI in `frontend/components/QuizPanel.tsx`.
- Dashboard pages already exist.

## Target Chat Experience

The chat page should feel like a focused tutor workspace.

Primary areas:

- Main lesson/chat column.
- Learning control side panel.
- Quiz or check answer panel.

## Required UI States

### Empty Chat

Show direct starter actions:

- Start my roadmap.
- Choose a topic.
- Take a diagnostic.
- Continue last topic.

### Active Lesson

Show:

- Current roadmap step.
- Mastery percent.
- Topic status.
- Lesson response.
- One check question.
- Practice task.
- Good next questions.

### Check Answer

The user should be able to answer the tutor's check question without a full quiz.

Required behavior:

- Show the current check question.
- Submit a short answer.
- Display feedback.
- Update mastery and recommendation.

### Quiz

Keep the existing quiz panel, but show:

- Pass/fail mastery gate.
- What to review if failed.
- Next topic if passed.

### Side Panel

Must include:

- Current topic.
- Roadmap progress.
- Mastery bar.
- Weak topics.
- Move-on criteria.
- Micro steps.
- Next questions.
- Upcoming topics.

## Store Changes

`frontend/store/tutor.ts` should track:

```ts
type TutorState = {
  messages: Message[];
  quiz: Quiz | null;
  checkQuestion: CheckQuestion | null;
  sidePanel: SidePanelState | null;
  nextAction: NextAction | null;
  selectedTopic: string | null;
  sending: boolean;
  submittingCheckAnswer: boolean;
};
```

## UX Acceptance Criteria

- A learner always knows what topic they are on.
- The next action is visible after every tutor response.
- A learner can answer a check question without leaving chat.
- Mastery changes are visible after checks and quizzes.
- Weak topics are visible before the tutor recommends moving ahead.
- The UI remains usable on mobile with the side panel stacked below chat.
