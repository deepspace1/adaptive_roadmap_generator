"use client";

import Link from "next/link";
import { Clock, Flame, Pencil, PlayCircle, Target } from "lucide-react";
import type { Roadmap, RoadmapStats, UserProfile } from "@/types/roadmap";

export function RoadmapSidebar({ roadmap, stats, profile }: { roadmap: Roadmap; stats: RoadmapStats; profile: UserProfile | null }) {
  const modules = roadmap.phases.flatMap((phase) => phase.modules);
  const nextModule = modules.find((module) => module.module_id === stats.next_module_id) || modules.find((module) => module.module_id === roadmap.next_suggested_module) || modules.find((module) => module.status === "in_progress" || module.status === "available");
  const weeklyGoal = stats.weekly_goal_hours ?? Math.round(roadmap.weekly_hours_commitment);
  const hoursLogged = stats.hours_logged_this_week ?? 0;
  const completedThisWeek = stats.modules_completed_this_week ?? 0;
  const weeklyProgress = weeklyGoal ? Math.min(100, (hoursLogged / weeklyGoal) * 100) : 0;

  return (
    <aside className="space-y-4 lg:sticky lg:top-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Your Learning Profile</h2>
          <Link href="/onboarding?edit=1" className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          {[
            ["Topic", profile?.topic || roadmap.topic],
            ["Goal", profile?.goal || "Personalized mastery"],
            ["Level", profile?.assessed_level || roadmap.user_level],
            ["Daily time", `${profile?.daily_time_minutes || Math.round((roadmap.weekly_hours_commitment * 60) / 7)} min`],
            ["Style", profile?.learning_style || "interactive"]
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-coral" />
          <h2 className="font-semibold">Focus for Today</h2>
        </div>
        {nextModule ? (
          <div className="mt-4 rounded-xl border border-teal/20 bg-teal/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">{nextModule.status === "in_progress" ? "Pick up where you left off" : "Start here today"}</p>
            <p className="mt-2 font-semibold">{nextModule.title}</p>
            <a href={`#module-${nextModule.module_id}`} className="focus-ring mt-4 inline-flex items-center gap-2 rounded-xl bg-teal px-3 py-2 text-sm font-semibold text-white">
              <PlayCircle className="h-4 w-4" /> Open module
            </a>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-saffron" />
          <h2 className="font-semibold">This Week</h2>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-full border-8 border-teal/20 text-lg font-semibold text-teal">{weeklyGoal}h</div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">{hoursLogged}h logged / {weeklyGoal}h goal</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div className="h-full bg-teal" style={{ width: `${weeklyProgress}%` }} />
            </div>
            <p className="mt-2 text-sm">{completedThisWeek} modules completed</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-coral" />
          <h2 className="font-semibold">Streak</h2>
        </div>
        <p className="mt-4 text-4xl font-semibold">{stats.learning_streak ?? 0} day streak</p>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={index} className={`h-3 w-3 rounded-full ${index < (stats.learning_streak ?? 0) ? "bg-coral" : "bg-gray-200 dark:bg-gray-700"}`} />
          ))}
        </div>
      </section>
    </aside>
  );
}
