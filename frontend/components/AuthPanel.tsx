"use client";

import Link from "next/link";
import { BrainCircuit, Loader2 } from "lucide-react";

export function AuthPanel({
  mode,
  error,
  loading,
  children
}: {
  mode: "login" | "register";
  error?: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  const isLogin = mode === "login";
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex min-h-[34rem] flex-col justify-between bg-ink px-6 py-8 text-white sm:px-10 lg:min-h-screen">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center bg-teal" style={{ borderRadius: 8 }}>
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/55">Multi-Agent Tutor</p>
            <h1 className="text-2xl font-semibold">Adaptive AI Personal Tutor</h1>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="text-5xl font-semibold leading-tight sm:text-6xl">
            Learn with a tutor that remembers where you stumble.
          </p>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">
            Roadmaps, lessons, quizzes, mastery scores, and knowledge gaps all work together in one focused learning loop.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm text-white/70">
          <span className="border-t border-white/20 pt-3">Planner</span>
          <span className="border-t border-white/20 pt-3">Teacher</span>
          <span className="border-t border-white/20 pt-3">Evaluator</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-md p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold">{isLogin ? "Welcome back" : "Create your tutor"}</h2>
            <p className="mt-2 text-sm text-ink/60">
              {isLogin ? "Continue your adaptive roadmap." : "Start with a goal and get a personalized roadmap."}
            </p>
          </div>
          {error ? <div className="mb-4 border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral" style={{ borderRadius: 8 }}>{error}</div> : null}
          {children}
          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-ink/55">{isLogin ? "New here?" : "Already registered?"}</span>
            <Link className="font-medium text-teal hover:underline" href={isLogin ? "/register" : "/login"}>
              {isLogin ? "Create account" : "Sign in"}
            </Link>
          </div>
          {loading ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-ink/55">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing your tutor
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
