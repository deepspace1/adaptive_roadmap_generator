"use client";

import { BriefcaseBusiness, Calendar, FolderKanban, GraduationCap, Leaf } from "lucide-react";
import type { OnboardingFormData } from "@/types/roadmap";

const suggestions = ["Python", "Web Dev", "Data Science", "Machine Learning", "UI/UX", "JavaScript", "SQL", "DevOps"];
const goals = [
  { value: "get a job", label: "Get a Job / Career Switch", icon: BriefcaseBusiness },
  { value: "build a project", label: "Build a Project", icon: FolderKanban },
  { value: "exam prep", label: "Academic / Exam Prep", icon: GraduationCap },
  { value: "personal growth", label: "Personal Growth / Curiosity", icon: Leaf }
];
const deadlines = ["1 week", "1 month", "3 months", "6 months", "no deadline"];

export function Step1Topic({ data, onChange }: { data: Partial<OnboardingFormData>; onChange: (partial: Partial<OnboardingFormData>) => void }) {
  return (
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Step 1</p>
      <h1 className="mt-2 text-3xl font-semibold">What do you want to learn?</h1>
      <div className="mt-6 space-y-7">
        <label className="block">
          <span className="text-sm font-semibold">Topic</span>
          <input
            value={data.topic || ""}
            onChange={(event) => onChange({ topic: event.target.value })}
            placeholder="e.g. Machine Learning, React, Spanish, Guitar..."
            className="mt-2 w-full rounded-xl border-gray-200 text-lg focus:border-teal focus:ring-teal dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="focus-ring rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm transition-all duration-200 ease-in-out hover:border-teal hover:text-teal dark:border-gray-700 dark:bg-gray-900"
              onClick={() => onChange({ topic: suggestion })}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div>
          <p className="text-sm font-semibold">Goal</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {goals.map(({ value, label, icon: Icon }) => {
              const active = data.goal === value;
              return (
                <button
                  key={value}
                  className={`focus-ring flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ease-in-out ${
                    active ? "border-teal bg-teal/10 text-teal" : "border-gray-200 bg-white hover:border-teal dark:border-gray-700 dark:bg-gray-900"
                  }`}
                  onClick={() => onChange({ goal: value })}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block max-w-sm">
          <span className="flex items-center gap-2 text-sm font-semibold"><Calendar className="h-4 w-4" /> Deadline</span>
          <select
            value={data.deadline || "3 months"}
            onChange={(event) => onChange({ deadline: event.target.value })}
            className="mt-2 w-full rounded-xl border-gray-200 focus:border-teal focus:ring-teal dark:border-gray-700 dark:bg-gray-900"
          >
            {deadlines.map((deadline) => (
              <option key={deadline} value={deadline}>
                {deadline}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
