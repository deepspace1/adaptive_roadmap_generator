"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";

type Profile = {
  learning_style: string;
  target_subject: string;
  daily_time_minutes: number;
  preferred_difficulty: string;
};

export default function SettingsPage() {
  const token = useSessionStore((state) => state.accessToken);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<Profile>({ learning_style: "balanced", target_subject: "Programming", daily_time_minutes: 30, preferred_difficulty: "adaptive" });

  useEffect(() => {
    if (!token) return;
    api<{ profile: Profile }>("/me", { token }).then((data) => data.profile && setProfile(data.profile));
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      learning_style: String(form.get("learning_style")),
      target_subject: String(form.get("target_subject")),
      daily_time_minutes: Number(form.get("daily_time_minutes")),
      preferred_difficulty: String(form.get("preferred_difficulty"))
    };
    await api("/profile", { method: "PATCH", token, body: JSON.stringify(payload) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-semibold">Settings</h1>
        <form className="panel mt-6 grid gap-5 p-6 sm:grid-cols-2" onSubmit={onSubmit}>
          <label className="block text-sm font-medium">
            Learning style
            <select name="learning_style" defaultValue={profile.learning_style} className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }}>
              <option value="balanced">Balanced</option>
              <option value="visual">Visual</option>
              <option value="socratic">Socratic</option>
              <option value="project">Project based</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Preferred difficulty
            <select name="preferred_difficulty" defaultValue={profile.preferred_difficulty} className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }}>
              <option value="adaptive">Adaptive</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Target subject
            <input name="target_subject" defaultValue={profile.target_subject} className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }} />
          </label>
          <label className="block text-sm font-medium">
            Daily minutes
            <input name="daily_time_minutes" type="number" min={5} max={240} defaultValue={profile.daily_time_minutes} className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }} />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button className="focus-ring inline-flex items-center gap-2 bg-teal px-4 py-3 font-medium text-white" style={{ borderRadius: 8 }}>
              <Save className="h-4 w-4" /> Save settings
            </button>
            {saved ? <span className="text-sm text-teal">Saved</span> : null}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
