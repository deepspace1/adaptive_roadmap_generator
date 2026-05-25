"use client";

import type { Roadmap } from "@/types/roadmap";

export function MilestoneTrack({ roadmap }: { roadmap: Roadmap }) {
  const completedModules = new Set(roadmap.phases.flatMap((phase) => phase.modules).filter((module) => module.status === "completed").map((module) => module.module_id));
  const nextIndex = roadmap.milestones.findIndex((milestone) => !milestone.required_module_ids.every((moduleId) => completedModules.has(moduleId)));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-xl font-semibold">Milestones</h2>
      <div className="relative mt-8 min-h-32">
        <div className="absolute left-0 right-0 top-8 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        {roadmap.milestones.map((milestone, index) => {
          const achieved = milestone.required_module_ids.every((moduleId) => completedModules.has(moduleId));
          const left = `${Math.min(96, Math.max(2, (milestone.target_week / Math.max(roadmap.total_duration_weeks, 1)) * 100))}%`;
          return (
            <div key={milestone.id} className="absolute top-0 w-28 -translate-x-1/2 text-center" style={{ left }} title={milestone.description}>
              <div
                className={`mx-auto grid h-16 w-16 place-items-center rounded-full border text-lg shadow-sm transition-all duration-200 ease-in-out ${
                  achieved
                    ? "border-teal bg-teal text-white shadow-teal/30"
                    : index === nextIndex
                      ? "border-saffron bg-saffron/20 text-ink ring-4 ring-saffron/20"
                      : "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-900"
                }`}
              >
                {milestone.badge_emoji || "*"}
              </div>
              <p className={`mt-2 text-sm ${achieved ? "font-bold text-ink dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>{milestone.title}</p>
              <p className="text-xs text-gray-400">Week {milestone.target_week}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
