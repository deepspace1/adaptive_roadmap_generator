"use client";

import { ModuleCard } from "@/components/roadmap/ModuleCard";
import type { RoadmapPhase } from "@/types/roadmap";

export function PhaseTimeline({
  phases,
  onStatusChange
}: {
  phases: RoadmapPhase[];
  onStatusChange: (moduleId: string, status: "in_progress" | "completed") => Promise<void>;
}) {
  return (
    <section className="space-y-6">
      {phases.map((phase) => {
        const completed = phase.modules.filter((module) => module.status === "completed").length;
        const progress = Math.round((completed / Math.max(phase.modules.length, 1)) * 100);
        return (
          <section key={phase.phase_number} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: phase.color }} />
            <div className="p-5 sm:p-6">
              <div className="grid gap-5 xl:grid-cols-[18rem_1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: phase.color }}>
                      {phase.phase_number}
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Phase {phase.phase_number}</p>
                      <h2 className="text-xl font-semibold">{phase.phase_title}</h2>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{phase.phase_goal}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-xl bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-900 dark:text-gray-300">{phase.duration_weeks} weeks</span>
                    <span className="rounded-xl bg-teal/10 px-2.5 py-1 text-teal">{completed}/{phase.modules.length} modules done</span>
                    <span className="rounded-xl bg-saffron/20 px-2.5 py-1 text-ink dark:text-gray-100">{progress}% complete</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className="h-full transition-all duration-200 ease-in-out" style={{ width: `${progress}%`, backgroundColor: phase.color }} />
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {phase.modules.map((module) => (
                    <ModuleCard key={module.module_id} module={module} phaseColor={phase.color} onStatusChange={onStatusChange} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </section>
  );
}
