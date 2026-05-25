"use client";

import { X } from "lucide-react";
import { KeyboardEvent, useState } from "react";
import type { OnboardingFormData } from "@/types/roadmap";

const levels = [
  { value: "absolute beginner", label: "Absolute Beginner", description: "Brand new and starting from first principles." },
  { value: "beginner", label: "Beginner", description: "You know the words but need guided practice." },
  { value: "intermediate", label: "Intermediate", description: "You can build small things and want structure." },
  { value: "advanced", label: "Advanced", description: "You need depth, edge cases, and stronger projects." },
  { value: "expert", label: "Expert", description: "You want refinement, portfolio quality, and mastery checks." }
];
const experiences = ["I've read/watched about it", "Done tutorials", "Built small projects", "Worked professionally", "Nothing yet"];

export function Step2Background({ data, onChange }: { data: Partial<OnboardingFormData>; onChange: (partial: Partial<OnboardingFormData>) => void }) {
  const [tag, setTag] = useState("");
  const levelIndex = Math.max(0, levels.findIndex((level) => level.value === (data.skill_level || "beginner")));
  const related = (data.related_skills || "").split(",").map((item) => item.trim()).filter(Boolean);

  function addTag() {
    const trimmed = tag.trim();
    if (!trimmed || related.includes(trimmed)) return;
    onChange({ related_skills: [...related, trimmed].join(", ") });
    setTag("");
  }

  function onTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Step 2</p>
      <h1 className="mt-2 text-3xl font-semibold">Tell us about your background</h1>
      <div className="mt-6 space-y-8">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Skill level</p>
            <span className="rounded-xl bg-teal/10 px-3 py-1 text-sm font-medium text-teal">{levels[levelIndex]?.label}</span>
          </div>
          <input
            type="range"
            min={0}
            max={4}
            value={levelIndex < 0 ? 1 : levelIndex}
            onChange={(event) => onChange({ skill_level: levels[Number(event.target.value)].value })}
            className="mt-4 w-full accent-teal"
          />
          <div className="mt-2 grid grid-cols-5 gap-2 text-center text-xs text-gray-500 dark:text-gray-400">
            {levels.map((level) => <span key={level.value}>{level.label}</span>)}
          </div>
          <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">{levels[levelIndex]?.description}</p>
        </div>

        <div>
          <p className="text-sm font-semibold">Prior experience</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {experiences.map((experience) => {
              const selected = (data.prior_experience || []).includes(experience);
              return (
                <button
                  key={experience}
                  className={`focus-ring rounded-xl border px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
                    selected ? "border-teal bg-teal/10 text-teal" : "border-gray-200 bg-white hover:border-teal dark:border-gray-700 dark:bg-gray-900"
                  }`}
                  onClick={() =>
                    onChange({
                      prior_experience: selected
                        ? (data.prior_experience || []).filter((item) => item !== experience)
                        : [...(data.prior_experience || []), experience]
                    })
                  }
                >
                  {experience}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Related skills</p>
          <div className="mt-3 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
            {related.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-xl bg-saffron/20 px-3 py-1 text-sm">
                {item}
                <button onClick={() => onChange({ related_skills: related.filter((skill) => skill !== item).join(", ") })} aria-label={`Remove ${item}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={addTag}
              placeholder="Type and press Enter"
              className="min-w-40 flex-1 border-0 bg-transparent p-1 text-sm focus:ring-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
