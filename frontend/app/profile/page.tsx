"use client";

import { AppShell } from "@/components/AppShell";
import { useSessionStore } from "@/store/session";

export default function ProfilePage() {
  const user = useSessionStore((state) => state.user);
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-semibold">Profile</h1>
        <section className="panel mt-6 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" value={user?.name || ""} />
            <Field label="Email" value={user?.email || ""} />
            <Field label="Level" value={user?.current_level || "Beginner"} />
            <Field label="Goal" value={user?.learning_goal || ""} wide />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-sm text-ink/50">{label}</p>
      <p className="mt-2 border border-black/10 bg-white px-3 py-3 font-medium" style={{ borderRadius: 8 }}>{value || "Not set"}</p>
    </div>
  );
}
