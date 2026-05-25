"use client";

import { BookOpen, Clock, Code2, Film, Gauge, MousePointerClick, Palette } from "lucide-react";
import type { OnboardingFormData } from "@/types/roadmap";

const timeStops = [15, 30, 60, 90, 120, 180];
const styles = [
  { value: "visual", label: "Visual", detail: "diagrams, charts, mind maps", icon: Palette },
  { value: "reading", label: "Reading & Writing", detail: "articles, notes, docs", icon: BookOpen },
  { value: "project", label: "Project-Based", detail: "learn by building", icon: Code2 },
  { value: "video", label: "Video", detail: "watch and follow along", icon: Film },
  { value: "interactive", label: "Interactive", detail: "coding exercises, quizzes", icon: MousePointerClick }
];
const paces = [
  { value: "gradual", label: "Gradual", detail: "thorough, never overwhelmed", icon: Clock },
  { value: "balanced", label: "Balanced", detail: "steady progress", icon: Gauge },
  { value: "intensive", label: "Intensive", detail: "fast, challenging, all-in", icon: Gauge }
];

export function Step3Preferences({ data, onChange }: { data: Partial<OnboardingFormData>; onChange: (partial: Partial<OnboardingFormData>) => void }) {
  const daily = data.daily_time_minutes || 30;
  const timeIndex = Math.max(0, timeStops.indexOf(daily));
  const weeklyHours = Math.round((daily * 7) / 60);
  const pace = data.pace || "balanced";
  return (
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Step 3</p>
      <h1 className="mt-2 text-3xl font-semibold">How do you like to learn?</h1>
      <div className="mt-6 space-y-8">
        <div>
          <p className="text-sm font-semibold">Daily time</p>
          <input
            type="range"
            min={0}
            max={timeStops.length - 1}
            value={timeIndex < 0 ? 1 : timeIndex}
            onChange={(event) => onChange({ daily_time_minutes: timeStops[Number(event.target.value)] })}
            className="mt-4 w-full accent-teal"
          />
          <div className="mt-2 grid grid-cols-6 gap-2 text-center text-xs text-gray-500 dark:text-gray-400">
            {["15m", "30m", "1h", "1.5h", "2h", "3h+"].map((label) => <span key={label}>{label}</span>)}
          </div>
          <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            That is {weeklyHours} hours per week, great for a {pace} approach.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">Learning style</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {styles.map(({ value, label, detail, icon: Icon }) => {
              const active = (data.learning_style || "interactive") === value;
              return (
                <button
                  key={value}
                  className={`focus-ring rounded-xl border p-4 text-left transition-all duration-200 ease-in-out ${
                    active ? "border-teal bg-teal/10 text-teal" : "border-gray-200 bg-white hover:border-teal dark:border-gray-700 dark:bg-gray-900"
                  }`}
                  onClick={() => onChange({ learning_style: value })}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-3 block font-semibold">{label}</span>
                  <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">{detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Pace preference</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {paces.map(({ value, label, detail, icon: Icon }) => {
              const active = pace === value;
              return (
                <button
                  key={value}
                  className={`focus-ring rounded-xl border p-4 text-left transition-all duration-200 ease-in-out ${
                    active ? "border-teal bg-teal/10 text-teal" : "border-gray-200 bg-white hover:border-teal dark:border-gray-700 dark:bg-gray-900"
                  }`}
                  onClick={() => onChange({ pace: value })}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-3 block font-semibold">{label}</span>
                  <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">{detail}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
