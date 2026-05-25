"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { useSessionStore } from "@/store/session";

export default function RegisterPage() {
  const router = useRouter();
  const register = useSessionStore((state) => state.register);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await register({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        learning_goal: String(form.get("learning_goal"))
      });
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPanel mode="register" error={error} loading={loading}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium">
          Name
          <input name="name" required className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }} />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input name="password" type="password" minLength={6} required className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }} />
        </label>
        <label className="block text-sm font-medium">
          Learning goal
          <textarea
            name="learning_goal"
            required
            minLength={2}
            rows={3}
            placeholder="Learn AI with Python"
            className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal"
            style={{ borderRadius: 8 }}
          />
        </label>
        <button className="focus-ring inline-flex w-full items-center justify-center gap-2 bg-teal px-4 py-3 font-semibold text-white" style={{ borderRadius: 8 }}>
          Build roadmap <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthPanel>
  );
}
