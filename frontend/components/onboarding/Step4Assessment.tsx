"use client";

import { CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { requiredOnboardingData, useRoadmapStore } from "@/store/roadmapStore";
import { useSessionStore } from "@/store/session";
import type { OnboardingFormData, Roadmap, SkillAssessmentQuestion } from "@/types/roadmap";

type Evaluation = {
  score: number;
  total: number;
  assessed_level: string;
  feedback: string;
};

const loadingSteps = [
  "Analyzing your learning profile...",
  "Mapping knowledge graph...",
  "Sequencing modules by difficulty...",
  "Personalizing resources for your style...",
  "Building your roadmap..."
];

export function Step4Assessment({ data }: { data: Partial<OnboardingFormData> }) {
  const token = useSessionStore((state) => state.accessToken);
  const { assessmentId, setAssessmentId, updateOnboardingData, setRoadmap, setGenerating } = useRoadmapStore();
  const [questions, setQuestions] = useState<SkillAssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");
  const [generating, setGeneratingLocal] = useState(false);
  const [slowMessage, setSlowMessage] = useState(false);

  const currentQuestion = questions[currentIndex];
  const selected = currentQuestion ? answers[currentQuestion.id] : "";
  const complete = questions.length > 0 && Object.keys(answers).length === questions.length;

  useEffect(() => {
    let cancelled = false;
    async function loadQuestions() {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const result = await api<{ assessment_id: string; questions: SkillAssessmentQuestion[] }>("/api/skill-assessment/questions", {
          method: "POST",
          token,
          body: JSON.stringify({ topic: data.topic || "Programming", level: data.skill_level || "beginner" })
        });
        if (cancelled) return;
        setAssessmentId(result.assessment_id);
        setQuestions(result.questions);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [data.skill_level, data.topic, setAssessmentId, token]);

  useEffect(() => {
    if (!generating) return;
    const timer = window.setTimeout(() => setSlowMessage(true), 8000);
    return () => window.clearTimeout(timer);
  }, [generating]);

  async function evaluate() {
    if (!token || !assessmentId) return;
    setEvaluating(true);
    setError("");
    try {
      const result = await api<Evaluation>("/api/skill-assessment/evaluate", {
        method: "POST",
        token,
        body: JSON.stringify({ assessment_id: assessmentId, answers })
      });
      setEvaluation(result);
      updateOnboardingData({ assessed_level: result.assessed_level });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session expired, retake quiz");
    } finally {
      setEvaluating(false);
    }
  }

  async function submitOnboarding() {
    if (!token || !evaluation) return;
    setGeneratingLocal(true);
    setGenerating(true);
    setSlowMessage(false);
    setError("");
    try {
      const payload = { ...requiredOnboardingData(data), assessed_level: evaluation.assessed_level };
      const result = await api<{ success: boolean; roadmap_id: number; roadmap: Roadmap }>("/api/onboarding/submit", {
        method: "POST",
        token,
        body: JSON.stringify(payload)
      });
      setRoadmap(result.roadmap, result.roadmap_id, null);
      window.location.href = "/dashboard/roadmap";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Roadmap generation failed. Try again.");
      setGeneratingLocal(false);
      setGenerating(false);
    }
  }

  const levelClass = useMemo(() => {
    if (!evaluation) return "bg-gray-100 text-gray-600";
    if (evaluation.assessed_level === "expert") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200";
    if (evaluation.assessed_level === "advanced") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200";
    if (evaluation.assessed_level === "intermediate") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200";
  }, [evaluation]);

  if (generating) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/90 px-4 text-white">
        <div className="w-full max-w-lg rounded-xl border border-white/10 bg-white/10 p-6 shadow-sm backdrop-blur">
          <Sparkles className="h-8 w-8 text-saffron" />
          <h2 className="mt-4 text-2xl font-semibold">Building your roadmap</h2>
          <div className="mt-5 space-y-3">
            {loadingSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 className={`h-4 w-4 ${index < loadingSteps.length - 1 ? "text-green-300" : "text-saffron"}`} />
                <span>{index === 1 && data.topic ? `Mapping knowledge graph for ${data.topic}...` : step}</span>
              </div>
            ))}
          </div>
          {slowMessage ? <p className="mt-5 text-sm text-white/70">Still working on it. Detailed roadmaps can take a little longer.</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Step 4</p>
      <h1 className="mt-2 text-3xl font-semibold">Quick skill check</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">Let us calibrate your level before generating the roadmap.</p>

      {error ? (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-coral/30 bg-coral/10 p-3 text-sm text-coral">
          <span>{error}</span>
          <button className="inline-flex items-center gap-1 font-semibold" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 flex items-center gap-3 text-gray-500 dark:text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading assessment questions
        </div>
      ) : currentQuestion && !evaluation ? (
        <div className="mt-8">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div className="h-full bg-teal transition-all duration-200 ease-in-out" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
          </div>
          <h2 className="mt-6 text-2xl font-semibold">{currentQuestion.question}</h2>
          <div className="mt-5 grid gap-3">
            {(["A", "B", "C", "D"] as const).map((key) => (
              <button
                key={key}
                className={`focus-ring rounded-xl border p-4 text-left transition-all duration-200 ease-in-out ${
                  selected === key ? "border-teal bg-teal/10 text-teal" : "border-gray-200 bg-white hover:border-teal dark:border-gray-700 dark:bg-gray-900"
                } ${selected ? "disabled:cursor-not-allowed" : ""}`}
                disabled={Boolean(selected)}
                onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: key }))}
              >
                <span className="font-semibold">{key}.</span> {currentQuestion.options[key]}
              </button>
            ))}
          </div>
          {selected ? (
            <button
              className="focus-ring mt-6 rounded-xl bg-teal px-5 py-3 font-semibold text-white transition-all duration-200 ease-in-out hover:bg-teal/90"
              onClick={() => {
                if (currentIndex < questions.length - 1) {
                  setCurrentIndex((index) => index + 1);
                } else {
                  evaluate();
                }
              }}
            >
              {complete ? "Submit answers" : "Next Question"}
            </button>
          ) : null}
          {evaluating ? <p className="mt-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Submitting your answers...</p> : null}
        </div>
      ) : evaluation ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Assessment result</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-4xl font-semibold">{evaluation.score}/{evaluation.total}</span>
            <span className={`rounded-xl px-3 py-1 text-sm font-semibold ${levelClass}`}>{evaluation.assessed_level}</span>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{evaluation.feedback}</p>
          <button
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-3 font-semibold text-white transition-all duration-200 ease-in-out hover:bg-teal/90"
            onClick={submitOnboarding}
          >
            Generate My Roadmap
          </button>
        </div>
      ) : null}
    </div>
  );
}
