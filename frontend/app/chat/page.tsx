"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, CheckCircle2, Flag, HelpCircle, KeyRound, Loader2, Map, SendHorizonal, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuizPanel } from "@/components/QuizPanel";
import { CheckFeedback, CheckQuestion, SidePanelState, useTutorStore } from "@/store/tutor";

const starters = ["Start my roadmap", "Teach from basics", "Quiz current topic", "What should I ask next?"];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, sending, quiz, submitQuiz, state, checkQuestion, checkFeedback, submitCheckAnswer, submittingCheckAnswer } = useTutorStore();
  const sidePanel = state.side_panel;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput("");
    await sendMessage(message);
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="panel flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden">
          <div className="border-b border-black/10 px-5 py-4">
            <p className="text-sm uppercase tracking-[0.2em] text-ink/45">Adaptive tutor loop</p>
            <h1 className="mt-1 text-3xl font-semibold">Tutor chat</h1>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-16 text-center">
                <span className="grid h-14 w-14 place-items-center bg-teal/10 text-teal" style={{ borderRadius: 8 }}>
                  <Sparkles className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold">Ask for a lesson, quiz, or roadmap nudge.</h2>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {starters.map((starter) => (
                    <button
                      key={starter}
                      className="focus-ring border border-black/10 bg-white px-3 py-2 text-sm hover:border-teal hover:text-teal"
                      style={{ borderRadius: 8 }}
                      onClick={() => sendMessage(starter)}
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[48rem] whitespace-pre-wrap px-4 py-3 leading-7 ${
                    message.role === "user" ? "bg-ink text-white" : "border border-black/10 bg-white text-ink"
                  }`}
                  style={{ borderRadius: 8 }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex items-center gap-2 text-sm text-ink/55">
                <Loader2 className="h-4 w-4 animate-spin" /> Tutor agents are working
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>
          <form className="border-t border-black/10 bg-white/75 p-4" onSubmit={onSubmit}>
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Teach me dynamic programming"
                className="min-w-0 flex-1 border-black/10 focus:border-teal focus:ring-teal"
                style={{ borderRadius: 8 }}
              />
              <button className="focus-ring inline-flex h-11 w-11 items-center justify-center bg-teal text-white disabled:opacity-50" style={{ borderRadius: 8 }} disabled={sending}>
                <SendHorizonal className="h-5 w-5" />
              </button>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <LearningControlPanel panel={sidePanel} onAsk={(question) => sendMessage(question)} />
          {checkQuestion ? (
            <CheckAnswerPanel
              question={checkQuestion}
              feedback={checkFeedback}
              loading={submittingCheckAnswer}
              onSubmit={submitCheckAnswer}
            />
          ) : null}
          {quiz ? (
            <QuizPanel topic={quiz.topic} difficulty={quiz.difficulty} questions={quiz.questions} onSubmit={async (answers) => { await submitQuiz(answers); }} />
          ) : (
            <aside className="panel p-5">
              <h2 className="text-xl font-semibold">Quiz panel</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">A quiz appears after the tutor teaches a topic.</p>
            </aside>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CheckAnswerPanel({
  question,
  feedback,
  loading,
  onSubmit
}: {
  question: CheckQuestion;
  feedback: CheckFeedback | null;
  loading: boolean;
  onSubmit: (answer: string) => Promise<CheckFeedback>;
}) {
  const [answer, setAnswer] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setAnswer("");
  }

  return (
    <aside className="panel p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink/45">Check yourself</p>
          <h2 className="mt-1 text-lg font-semibold">{question.topic}</h2>
        </div>
        <span className="bg-teal/10 px-3 py-1 text-sm font-medium text-teal" style={{ borderRadius: 999 }}>
          {question.difficulty}
        </span>
      </div>
      <p className="text-sm font-medium leading-6">{question.question}</p>
      <p className="mt-2 text-xs leading-5 text-ink/55">{question.hint}</p>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          className="min-h-24 w-full resize-none border-black/10 text-sm focus:border-teal focus:ring-teal"
          style={{ borderRadius: 8 }}
          placeholder="Write your answer"
        />
        <button
          className="focus-ring inline-flex w-full items-center justify-center gap-2 bg-teal px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderRadius: 8 }}
          disabled={loading || !answer.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Submit answer
        </button>
      </form>
      {feedback ? (
        <div className="mt-4 border border-black/10 bg-white p-3" style={{ borderRadius: 8 }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Feedback</p>
            <span className="text-sm font-semibold text-teal">{Math.round(feedback.mastery_score * 100)}%</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink/65">{feedback.feedback}</p>
          {feedback.missing_points.length ? (
            <p className="mt-2 text-xs leading-5 text-ink/50">Missing: {feedback.missing_points.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function LearningControlPanel({ panel, onAsk }: { panel?: SidePanelState; onAsk: (question: string) => void }) {
  const current = panel?.current_step;
  return (
    <aside className="panel overflow-hidden">
      <div className="border-b border-black/10 bg-ink px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center bg-white/10" style={{ borderRadius: 8 }}>
            <Map className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Learning path</p>
            <h2 className="text-lg font-semibold">{current?.topic || "Start your roadmap"}</h2>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>{panel?.progress_label || "0 / 0 topics complete"}</span>
            <span>{Math.round((current?.mastery_score || 0) * 100)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden bg-white/15" style={{ borderRadius: 999 }}>
            <div className="h-full bg-saffron" style={{ width: `${Math.min(100, Math.round((current?.mastery_score || 0) * 100))}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <PanelBlock icon={Target} title="Stay or switch">
          <p className="text-sm leading-6 text-ink/65">{panel?.recommendation || "Ask the tutor to start from basics."}</p>
          <ul className="mt-3 space-y-2">
            {(panel?.switch_criteria || ["Reach 80% mastery to unlock the next topic."]).map((item) => (
              <li key={item} className="flex gap-2 text-sm text-ink/70">
                <Flag className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </PanelBlock>

        <PanelBlock icon={BookOpenCheck} title="What to learn now">
          <ol className="space-y-2">
            {(panel?.micro_steps || ["Start the first lesson to generate steps."]).map((step, index) => (
              <li key={step} className="flex gap-2 text-sm text-ink/70">
                <span className="grid h-5 w-5 shrink-0 place-items-center bg-teal/10 text-xs font-semibold text-teal" style={{ borderRadius: 6 }}>{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </PanelBlock>

        <PanelBlock icon={KeyRound} title="Key words">
          <div className="grid gap-2">
            {(panel?.keywords || []).length ? panel!.keywords!.map((item) => (
              <div key={item.term} className="border border-black/10 bg-white px-3 py-2" style={{ borderRadius: 8 }}>
                <p className="text-sm font-semibold">{item.term}</p>
                <p className="mt-1 text-xs leading-5 text-ink/60">{item.meaning}</p>
              </div>
            )) : <p className="text-sm text-ink/60">Keywords appear after the first tutor response.</p>}
          </div>
        </PanelBlock>

        <PanelBlock icon={HelpCircle} title="Ask next">
          <div className="grid gap-2">
            {(panel?.next_questions || ["Start my roadmap"]).map((question) => (
              <button
                key={question}
                className="focus-ring border border-black/10 bg-white px-3 py-2 text-left text-sm hover:border-teal hover:text-teal"
                style={{ borderRadius: 8 }}
                onClick={() => onAsk(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </PanelBlock>

        <div className="grid grid-cols-2 gap-3">
          <MiniList title="Learned" items={panel?.learned || []} empty="None yet" done />
          <MiniList title="Upcoming" items={panel?.upcoming || []} empty="Start first" />
        </div>
      </div>
    </aside>
  );
}

function PanelBlock({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function MiniList({ title, items, empty, done }: { title: string; items: string[]; empty: string; done?: boolean }) {
  return (
    <div className="border border-black/10 bg-white p-3" style={{ borderRadius: 8 }}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{title}</p>
      <div className="space-y-1">
        {items.length ? items.slice(0, 4).map((item) => (
          <p key={item} className="flex items-center gap-1.5 truncate text-xs text-ink/65">
            {done ? <CheckCircle2 className="h-3.5 w-3.5 text-teal" /> : <span className="h-2 w-2 shrink-0 bg-saffron" style={{ borderRadius: 999 }} />}
            {item}
          </p>
        )) : <p className="text-xs text-ink/45">{empty}</p>}
      </div>
    </div>
  );
}
