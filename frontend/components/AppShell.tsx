"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BrainCircuit, LogOut, Map, MessageSquareText, Settings, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useSessionStore } from "@/store/session";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/roadmap", label: "Roadmap", icon: Map },
  { href: "/chat", label: "Tutor", icon: MessageSquareText },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrate, accessToken, hydrated, user, loadMe, logout } = useSessionStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe().catch(() => {
      logout();
      router.replace("/login");
    });
  }, [accessToken, hydrated, loadMe, logout, router]);

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-b border-black/10 bg-white/85 px-4 py-4 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r lg:px-5">
        <div className="flex items-center justify-between lg:block">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center bg-teal text-white" style={{ borderRadius: 8 }}>
              <BrainCircuit className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Adaptive Tutor</span>
              <span className="block text-xs text-ink/50">OpenRouter powered</span>
            </span>
          </Link>
          <button
            aria-label="Sign out"
            className="icon-button lg:hidden"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto lg:mt-10 lg:block lg:space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`focus-ring flex min-w-max items-center gap-3 px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-ink text-white" : "text-ink/65 hover:bg-black/5 hover:text-ink"
                }`}
                style={{ borderRadius: 8 }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 hidden border-t border-black/10 pt-5 lg:block">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/40">Student</p>
          <p className="mt-2 font-medium">{user?.name || "Learner"}</p>
          <p className="mt-1 line-clamp-2 text-sm text-ink/55">{user?.learning_goal || "Adaptive learning"}</p>
          <button
            className="focus-ring mt-5 inline-flex items-center gap-2 text-sm font-medium text-coral"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <section className="px-4 py-5 sm:px-6 lg:px-8">{children}</section>
    </main>
  );
}
