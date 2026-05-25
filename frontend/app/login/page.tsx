"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { useSessionStore } from "@/store/session";

export default function LoginPage() {
  const router = useRouter();
  const login = useSessionStore((state) => state.login);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPanel mode="login" error={error} loading={loading}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input name="password" type="password" required className="mt-2 w-full border-black/10 focus:border-teal focus:ring-teal" style={{ borderRadius: 8 }} />
        </label>
        <button className="focus-ring inline-flex w-full items-center justify-center gap-2 bg-teal px-4 py-3 font-semibold text-white" style={{ borderRadius: 8 }}>
          Sign in <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthPanel>
  );
}
