"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Gauge, Target } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AccuracyChart, MasteryChart } from "@/components/Charts";
import { Stat } from "@/components/Stat";
import { api } from "@/lib/api";
import { useRoadmapStore } from "@/store/roadmapStore";
import { useSessionStore } from "@/store/session";
import { useTutorStore } from "@/store/tutor";
import type { Roadmap, RoadmapStats, UserProfile } from "@/types/roadmap";

type Dashboard = {
  current_topic?: string | null;
  mastery: Array<{ topic: string; mastery_score: number }>;
  quizzes: Array<{ topic: string; score: number }>;
  plan: Array<{ day: number; topic: string; status: string }>;
  weak_topics: string[];
  stats: { topics_learned: number; average_mastery: number; quiz_accuracy: number; learning_streak: number };
};

export default function DashboardPage() {
  const token = useSessionStore((state) => state.accessToken);
  const selectedTopic = useTutorStore((state) => state.selectedTopic);
  const { onboardingCompleted, roadmap, roadmapStats, setOnboardingCompleted, setRoadmap } = useRoadmapStore();
  const [data, setData] = useState<Dashboard | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const currentTopic = data?.current_topic || selectedTopic || "Start a lesson";

  useEffect(() => {
    if (!token) return;
    api<Dashboard>("/dashboard", { token }).then(setData).catch(() => setData(null));
    api<{ completed: boolean; profile: UserProfile | null }>("/api/onboarding/status", { token })
      .then((result) => {
        setOnboardingCompleted(result.completed);
        setProfile(result.profile);
      })
      .catch(() => undefined);
    api<{ roadmap_id: number; roadmap: Roadmap; stats: RoadmapStats }>("/api/roadmap/active", { token })
      .then((result) => setRoadmap(result.roadmap, result.roadmap_id, result.stats))
      .catch(() => undefined);
  }, [setOnboardingCompleted, setRoadmap, token]);

  const nextModule = roadmap?.phases.flatMap((phase) => phase.modules).find((module) => module.module_id === roadmap.next_suggested_module || module.status === "in_progress" || module.status === "available");
  const currentPhase = roadmap?.phases.find((phase) => phase.phase_number === roadmapStats?.current_phase);
  const roadmapModules = roadmap?.phases.flatMap((phase) => phase.modules) || [];
  const phaseProgress = roadmap?.phases.map((phase) => ({
    topic: phase.phase_title,
    mastery_score: phase.modules.filter((module) => module.status === "completed").length / Math.max(phase.modules.length, 1)
  }));
  const lockedFocus = roadmapModules.filter((module) => module.status === "locked").slice(0, 6);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-ink/45">Learning analytics</p>
            <h1 className="mt-2 text-4xl font-semibold">Dashboard</h1>
          </div>
          <a className="focus-ring inline-flex items-center justify-center bg-teal px-4 py-3 font-medium text-white" style={{ borderRadius: 8 }} href="/chat">
            Start learning
          </a>
        </div>

        {!onboardingCompleted ? (
          <section className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-900/20 sm:flex-row sm:items-center">
            <p className="font-medium text-amber-900 dark:text-amber-100">Complete your profile to get your personalized AI roadmap.</p>
            <Link className="focus-ring inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white" href="/onboarding">
              Start Setup
            </Link>
          </section>
        ) : roadmap ? (
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Your Roadmap</p>
                <h2 className="mt-2 text-2xl font-semibold">{profile?.topic || roadmap.topic}</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Current phase: {currentPhase?.phase_title || "Getting started"}</p>
                {nextModule ? <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Next: {nextModule.title}</p> : null}
              </div>
              <div className="w-full lg:max-w-sm">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Progress</span>
                  <span>{roadmapStats?.completion_percentage || 0}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="h-full bg-teal transition-all duration-200 ease-in-out" style={{ width: `${roadmapStats?.completion_percentage || 0}%` }} />
                </div>
                <Link className="mt-4 inline-flex text-sm font-semibold text-teal hover:underline" href="/dashboard/roadmap">
                  View Full Roadmap
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active roadmap" value={roadmap?.topic || currentTopic} icon={BookOpenCheck} tone="teal" />
          <Stat label="Modules complete" value={`${roadmapStats?.completed_modules ?? 0}/${roadmapStats?.total_modules ?? 0}`} icon={BookOpenCheck} tone="teal" />
          <Stat label="Roadmap progress" value={`${roadmapStats?.completion_percentage ?? 0}%`} icon={Gauge} tone="saffron" />
          <Stat label="Current phase" value={roadmapStats?.current_phase_title || currentPhase?.phase_title || "Setup"} icon={Target} tone="coral" />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="panel p-5">
            <h2 className="text-xl font-semibold">Mastery by topic</h2>
            <div className="mt-4">
              <MasteryChart mastery={phaseProgress?.length ? phaseProgress : data?.mastery.length ? data.mastery : [{ topic: currentTopic, mastery_score: 0 }]} />
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="text-xl font-semibold">Quiz accuracy trend</h2>
            <div className="mt-4">
              <AccuracyChart quizzes={data?.quizzes.length ? data.quizzes : [{ topic: currentTopic, score: 0 }]} />
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="panel p-5">
            <h2 className="text-xl font-semibold">Locked next skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(lockedFocus.length ? lockedFocus : []).map((module) => (
                <span key={module.module_id} className="border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral" style={{ borderRadius: 999 }}>
                  {module.title}
                </span>
              ))}
              {!lockedFocus.length ? <span className="border border-teal/25 bg-teal/10 px-3 py-2 text-sm text-teal" style={{ borderRadius: 999 }}>No locked modules right now</span> : null}
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="text-xl font-semibold">Roadmap</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {roadmapModules.slice(0, 10).map((module, index) => (
                <div key={module.module_id} className="flex items-center gap-3 border border-black/10 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900" style={{ borderRadius: 8 }}>
                  <span className="grid h-8 w-8 place-items-center bg-mist text-sm font-semibold dark:bg-gray-800" style={{ borderRadius: 8 }}>{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{module.title}</span>
                  <span className={`h-2.5 w-2.5 ${module.status === "completed" ? "bg-green-500" : module.status === "in_progress" ? "bg-amber-500" : module.status === "available" ? "bg-blue-500" : "bg-gray-400"}`} style={{ borderRadius: 999 }} />
                </div>
              ))}
              {!roadmapModules.length ? <p className="text-sm text-ink/55">Complete onboarding to generate your roadmap.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
