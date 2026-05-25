"use client";

import { BookOpen, CheckCircle2, ChevronDown, CirclePlay, FileText, Film, HelpCircle, Hammer, Lock, Timer, Zap } from "lucide-react";
import { useState } from "react";
import type { ModuleStatus, RoadmapModule } from "@/types/roadmap";

const difficultyClasses = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200"
};

const resourceIcons = {
  video: Film,
  article: FileText,
  book: BookOpen,
  project: Hammer,
  quiz: HelpCircle
};

function statusMeta(status: ModuleStatus) {
  if (status === "completed") return { label: "Completed", icon: CheckCircle2, className: "text-green-500" };
  if (status === "in_progress") return { label: "In Progress", icon: Timer, className: "text-amber-500" };
  if (status === "available") return { label: "Available", icon: CirclePlay, className: "text-blue-500" };
  return { label: "Locked", icon: Lock, className: "text-gray-400" };
}

export function ModuleCard({
  module,
  phaseColor,
  onStatusChange
}: {
  module: RoadmapModule;
  phaseColor: string;
  onStatusChange: (moduleId: string, status: "in_progress" | "completed") => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const meta = statusMeta(module.status);
  const StatusIcon = meta.icon;
  const locked = module.status === "locked";
  const completed = module.status === "completed";

  async function handleAction() {
    if (locked || completed) return;
    setLoading(true);
    try {
      await onStatusChange(module.module_id, module.status === "in_progress" ? "completed" : "in_progress");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      id={`module-${module.module_id}`}
      className={`group rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-800 ${
        locked ? "opacity-50" : ""
      }`}
      title={locked ? `Complete ${module.prerequisites.join(", ") || "the prerequisite module"} first` : undefined}
    >
      <button className="w-full p-4 text-left" onClick={() => setExpanded((value) => !value)}>
        <div className="flex gap-4">
          <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: phaseColor }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={`text-base font-semibold ${completed ? "text-gray-400 line-through" : ""}`}>{module.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${difficultyClasses[module.difficulty]}`}>{module.difficulty}</span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                    <Timer className="h-3.5 w-3.5" /> ~{module.estimated_hours}h
                  </span>
                  {module.skills_taught.slice(0, 3).map((skill) => (
                    <span key={skill} className="rounded-xl bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal">{skill}</span>
                  ))}
                  {module.skills_taught.length > 3 ? <span className="rounded-xl bg-gray-100 px-2.5 py-1 text-xs text-gray-500">+{module.skills_taught.length - 3} more</span> : null}
                </div>
              </div>
              <div className={`flex items-center gap-2 text-sm font-semibold ${meta.className}`}>
                <StatusIcon className={`h-4 w-4 ${module.status === "in_progress" ? "animate-pulse" : ""}`} />
                <span>{meta.label}</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
              </div>
            </div>
          </div>
        </div>
      </button>

      <div className={`grid transition-all duration-200 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{module.description}</p>
            {module.prerequisites.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Prerequisites</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {module.prerequisites.map((prereq) => (
                    <a key={prereq} href={`#module-${prereq}`} className="rounded-xl border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-teal hover:text-teal dark:border-gray-700 dark:text-gray-300">
                      {prereq}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Resources</p>
              <div className="mt-3 space-y-3">
                {module.resources.map((resource) => {
                  const Icon = resourceIcons[resource.type];
                  return (
                    <div key={`${resource.type}-${resource.title}`} className="flex gap-3 text-sm">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                      <div>
                        <p className="font-semibold">{resource.title}</p>
                        <p className="text-gray-500 dark:text-gray-400">{resource.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {module.practice_project ? (
              <div className="rounded-xl border border-saffron/40 bg-saffron/10 p-3 text-sm">
                <div className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4" /> Practice project</div>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{module.practice_project}</p>
              </div>
            ) : null}
            <p className="text-sm italic text-gray-500 dark:text-gray-400">{module.mastery_criteria}</p>
            <button
              className={`focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 ${
                module.status === "in_progress" ? "bg-green-500 text-white" : module.status === "available" ? "bg-teal text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
              onClick={handleAction}
              disabled={locked || completed || loading}
            >
              {locked ? <Lock className="h-4 w-4" /> : completed ? <CheckCircle2 className="h-4 w-4" /> : module.status === "in_progress" ? <CheckCircle2 className="h-4 w-4" /> : <CirclePlay className="h-4 w-4" />}
              {locked ? "Locked" : completed ? "Completed" : module.status === "in_progress" ? "Mark as Complete" : "Start Module"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
