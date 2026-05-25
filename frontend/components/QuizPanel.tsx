"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { QuizQuestion } from "@/store/tutor";

export function QuizPanel({
  topic,
  difficulty,
  questions,
  onSubmit
}: {
  topic: string;
  difficulty: string;
  questions: QuizQuestion[];
  onSubmit: (answers: string[]) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <aside className="panel p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink/45">Adaptive quiz</p>
          <h2 className="mt-1 text-xl font-semibold">{topic}</h2>
        </div>
        <span className="bg-saffron/25 px-3 py-1 text-sm font-medium text-ink" style={{ borderRadius: 999 }}>
          {difficulty}
        </span>
      </div>
      <div className="space-y-5">
        {questions.map((question, index) => (
          <div key={question.question}>
            <p className="text-sm font-medium">{index + 1}. {question.question}</p>
            <div className="mt-3 grid gap-2">
              {question.options.map((option) => {
                const active = answers[index] === option;
                return (
                  <button
                    key={option}
                    className={`focus-ring flex items-center justify-between border px-3 py-2 text-left text-sm transition ${
                      active ? "border-teal bg-teal/10 text-teal" : "border-black/10 bg-white hover:border-teal/60"
                    }`}
                    style={{ borderRadius: 8 }}
                    onClick={() => {
                      const next = [...answers];
                      next[index] = option;
                      setAnswers(next);
                    }}
                  >
                    <span>{option}</span>
                    {active ? <CheckCircle2 className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        className="focus-ring mt-6 w-full bg-ink px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderRadius: 8 }}
        disabled={loading || answers.filter(Boolean).length < questions.length}
        onClick={async () => {
          setLoading(true);
          await onSubmit(answers);
          setLoading(false);
        }}
      >
        Submit quiz
      </button>
    </aside>
  );
}
