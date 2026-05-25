"use client";

import { BarChart3, CalendarCheck, Flag, Layers3, RefreshCw } from "lucide-react";
import type { Roadmap, RoadmapStats, UserProfile } from "@/types/roadmap";

export function RoadmapHeader({
  roadmap,
  stats,
  profile,
  onRegenerate
}: {
  roadmap: Roadmap;
  stats: RoadmapStats;
  profile: UserProfile | null;
  onRegenerate: () => void;
}) {
  const currentPhase = roadmap.phases.find((phase) => phase.phase_number === stats.current_phase) || roadmap.phases[0];
  const cards = [
    { label: "Total Modules", value: String(stats.total_modules), icon: Layers3 },
    { label: "Est. Completion", value: stats.estimated_completion_date, icon: CalendarCheck },
    { label: "Current Phase", value: stats.current_phase_title || currentPhase?.phase_title || "Start", icon: Flag },
    { label: "Overall Progress", value: `${stats.completion_percentage}%`, icon: BarChart3 }
  ];

  return (
    <header className="border-b border-gray-200 bg-white px-4 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Your AI Roadmap</p>
            <h1 className="mt-2 text-4xl font-semibold">{roadmap.topic}</h1>
            <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">{profile?.goal || roadmap.summary}</p>
          </div>
          <button
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-in-out hover:border-teal hover:text-teal dark:border-gray-700 dark:bg-gray-800"
            onClick={onRegenerate}
          >
            <RefreshCw className="h-4 w-4" /> Regenerate Roadmap
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-teal via-saffron to-coral transition-all duration-700 ease-in-out"
            style={{ width: `${stats.completion_percentage}%` }}
          />
        </div>
      </div>
    </header>
  );
}
