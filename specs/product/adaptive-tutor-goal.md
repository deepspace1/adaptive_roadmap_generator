# Adaptive Tutor Product Goal

## Problem

The current tutor can generate a roadmap, teach a topic, show a quiz, and track mastery. It still needs a stronger learner model and clearer adaptation loop so it feels like a real tutor instead of a generic chatbot.

## Target Experience

The learner should be able to say something like:

> I want to learn Python from basics.

The tutor should then:

1. Ask a short diagnostic or infer the first safe starting point.
2. Build a roadmap for Python.
3. Start with the first learnable concept.
4. Teach in the user's preferred style.
5. Ask one check question.
6. Use the answer to update mastery and next steps.
7. Keep weak areas visible.
8. Move forward only after mastery is high enough.

## Learner Profile

The tutor should maintain these learner fields:

- `goal`: What the learner wants to achieve.
- `target_subject`: Main subject or course area.
- `current_level`: beginner, intermediate, advanced, or unknown.
- `learning_style`: balanced, visual, example-first, Socratic, project-based, or concise.
- `preferred_difficulty`: adaptive, easy, medium, or hard.
- `daily_time_minutes`: available study time.
- `pace`: slow, normal, fast.
- `known_topics`: concepts the learner already understands.
- `weak_topics`: concepts that need review.
- `motivation`: exam, job, project, curiosity, interview, or school.

## Tutor Response Contract

Every teaching response must include:

- Roadmap step.
- Current topic.
- Why this topic matters.
- Basic explanation.
- One concrete example.
- Key words.
- One check question.
- Practice task.
- Recommendation: continue, review, quiz, or move next.

## Adaptation Rules

- If mastery is below `0.50`, teach easier and add prerequisite review.
- If mastery is from `0.50` to `0.79`, teach at medium depth and give practice.
- If mastery is `0.80` or higher, offer harder examples and allow topic progression.
- If the learner says they are confused, lower difficulty and ask a smaller check question.
- If the learner answers correctly twice in a row, increase difficulty slightly.
- If the learner changes topic, create or update that topic in the roadmap instead of losing context.
- If the learner asks a generic message like "continue", use the current roadmap step.

## Acceptance Criteria

- A new user can register with a learning goal and receive a roadmap.
- A learner can start a chat without naming a topic and still get the current roadmap topic.
- A learner can name a topic and the tutor adjusts the roadmap around it.
- A tutor response contains the full response contract.
- A check answer or quiz answer changes mastery.
- The side panel shows current topic, mastery, weak topics, next questions, and move-on rules.
- The dashboard shows current topic, completed topics, quiz history, and weak topics.
