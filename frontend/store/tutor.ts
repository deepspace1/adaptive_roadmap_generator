"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

export type CheckQuestion = {
  topic: string;
  difficulty: string;
  question: string;
  expected_answer_points: string[];
  hint: string;
};

export type CheckFeedback = {
  score: number;
  mastery_score: number;
  feedback: string;
  missing_points: string[];
  next_action: "review" | "practice" | "quiz" | "continue" | "move_next";
};

export type SidePanelState = {
  current_step?: { topic: string; day: number; mastery_score: number };
  learned?: string[];
  upcoming?: string[];
  next_topic?: string | null;
  progress_label?: string;
  keywords?: Array<{ term: string; meaning: string }>;
  micro_steps?: string[];
  next_questions?: string[];
  switch_criteria?: string[];
  recommendation?: string;
  weak_topics?: string[];
};

type TutorState = {
  messages: Message[];
  quiz: { topic: string; difficulty: string; questions: QuizQuestion[] } | null;
  checkQuestion: CheckQuestion | null;
  checkFeedback: CheckFeedback | null;
  state: { side_panel?: SidePanelState } & Record<string, unknown>;
  selectedTopic: string | null;
  sending: boolean;
  submittingCheckAnswer: boolean;
  setSelectedTopic: (topic: string | null) => void;
  sendMessage: (message: string, topic?: string) => Promise<void>;
  submitCheckAnswer: (answer: string) => Promise<CheckFeedback>;
  submitQuiz: (answers: string[]) => Promise<{ score: number; mastery_score: number }>;
};

function cleanTopic(topic?: string | null): string | null {
  const cleaned = topic?.trim();
  return cleaned ? cleaned : null;
}

function isControlTopic(topic?: string | null): boolean {
  const normalized = topic?.trim().replace(/[?.!]+$/g, "").replace(/\s+/g, " ").toLowerCase();
  return !normalized || /^(hi|hello|hey|start|begin|continue|yes|no|ok|okay|current topic|basics|basic|from basics|from basic|start my roadmap|teach from basics|what should i ask next|quiz current topic|next)$/.test(normalized);
}

function safeTopic(topic?: string | null): string | null {
  const cleaned = cleanTopic(topic);
  return cleaned && !isControlTopic(cleaned) ? cleaned : null;
}

function inferTopicFromMessage(message: string): string | null {
  const cleaned = message.trim();
  const match = cleaned.match(/^(?:teach(?:\s+me)?|learn|explain|practice|quiz|help me with|topic is)\s+(.+)$/i);
  const topic = match ? match[1] : cleaned.split(/\s+/).length <= 4 ? cleaned : "";
  const normalized = topic.replace(/[?.!]+$/g, "").trim();
  if (isControlTopic(normalized)) return null;
  return normalized;
}

function storedTopic(): string | null {
  if (typeof window === "undefined") return null;
  return safeTopic(localStorage.getItem("selected_topic"));
}

function rememberTopic(topic: string | null): void {
  if (typeof window === "undefined") return;
  const selectedTopic = safeTopic(topic);
  if (selectedTopic) {
    localStorage.setItem("selected_topic", selectedTopic);
  } else {
    localStorage.removeItem("selected_topic");
  }
}

export const useTutorStore = create<TutorState>((set, get) => ({
  messages: [],
  quiz: null,
  checkQuestion: null,
  checkFeedback: null,
  state: {},
  selectedTopic: storedTopic(),
  sending: false,
  submittingCheckAnswer: false,
  setSelectedTopic: (topic) => {
    const selectedTopic = safeTopic(topic);
    rememberTopic(selectedTopic);
    set({ selectedTopic });
  },
  sendMessage: async (message, topic) => {
    const token = useSessionStore.getState().accessToken;
    const explicitTopic = inferTopicFromMessage(message);
    const selectedTopic = safeTopic(topic) || explicitTopic || safeTopic(get().selectedTopic) || storedTopic();
    const payload = { message, topic: selectedTopic };
    console.log("Selected topic:", selectedTopic);
    console.log("Chat request payload:", payload);
    set((current) => ({ sending: true, messages: [...current.messages, { role: "user", content: message }] }));
    try {
      const result = await api<{
        message: string;
        updated_state: {
          quiz?: { topic: string; difficulty: string; questions: QuizQuestion[] };
          check_question?: CheckQuestion;
          side_panel?: SidePanelState;
        } & Record<string, unknown>;
      }>("/chat", {
        method: "POST",
        token,
        body: JSON.stringify(payload)
      });
      const responseTopic = safeTopic(result.updated_state.side_panel?.current_step?.topic || result.updated_state.quiz?.topic || selectedTopic);
      rememberTopic(responseTopic);
      set((current) => ({
        messages: [...current.messages, { role: "assistant", content: result.message }],
        quiz: result.updated_state.quiz || null,
        checkQuestion: result.updated_state.check_question || null,
        checkFeedback: null,
        state: result.updated_state,
        selectedTopic: responseTopic,
        sending: false
      }));
    } catch (error) {
      set((current) => ({
        messages: [...current.messages, { role: "assistant", content: error instanceof Error ? error.message : "Tutor request failed" }],
        sending: false
      }));
    }
  },
  submitCheckAnswer: async (answer) => {
    const token = useSessionStore.getState().accessToken;
    const checkQuestion = get().checkQuestion;
    if (!checkQuestion) throw new Error("No active check question");
    set({ submittingCheckAnswer: true });
    try {
      const result = await api<CheckFeedback>("/check-answer/submit", {
        method: "POST",
        token,
        body: JSON.stringify({
          topic: checkQuestion.topic,
          question: checkQuestion.question,
          answer,
          expected_answer_points: checkQuestion.expected_answer_points
        })
      });
      set((current) => {
        const sidePanel = current.state.side_panel;
        const updatedSidePanel = sidePanel?.current_step
          ? {
              ...sidePanel,
              current_step: {
                ...sidePanel.current_step,
                mastery_score: result.mastery_score
              },
              recommendation:
                result.next_action === "review"
                  ? `Review ${checkQuestion.topic} with a smaller example.`
                  : result.next_action === "quiz"
                    ? `You are ready to quiz ${checkQuestion.topic}.`
                    : `Practice ${checkQuestion.topic} once more, then quiz.`
            }
          : sidePanel;
        return {
          messages: [
            ...current.messages,
            {
              role: "assistant",
              content: `Check scored ${Math.round(result.score * 100)}%. ${result.feedback} Mastery is now ${Math.round(result.mastery_score * 100)}%.`
            }
          ],
          checkFeedback: result,
          state: { ...current.state, side_panel: updatedSidePanel },
          submittingCheckAnswer: false
        };
      });
      return result;
    } catch (error) {
      set((current) => ({
        messages: [...current.messages, { role: "assistant", content: error instanceof Error ? error.message : "Check answer failed" }],
        submittingCheckAnswer: false
      }));
      throw error;
    }
  },
  submitQuiz: async (answers) => {
    const token = useSessionStore.getState().accessToken;
    const quiz = get().quiz;
    if (!quiz) throw new Error("No active quiz");
    const result = await api<{ score: number; mastery_score: number }>("/quiz/submit", {
      method: "POST",
      token,
      body: JSON.stringify({ topic: quiz.topic, answers, questions: quiz.questions })
    });
    set((current) => ({
      messages: [
        ...current.messages,
        {
          role: "assistant",
          content: `Quiz scored ${Math.round(result.score * 100)}%. Mastery is now ${Math.round(result.mastery_score * 100)}%.`
        }
      ]
    }));
    return result;
  }
}));
