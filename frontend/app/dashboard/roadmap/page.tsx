"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MilestoneTrack } from "@/components/roadmap/MilestoneTrack";
import { PhaseTimeline } from "@/components/roadmap/PhaseTimeline";
import { RoadmapHeader } from "@/components/roadmap/RoadmapHeader";
import { RoadmapSidebar } from "@/components/roadmap/RoadmapSidebar";
import { api } from "@/lib/api";
import { useRoadmapStore } from "@/store/roadmapStore";
import { useSessionStore } from "@/store/session";
import type { Roadmap, RoadmapStats, UserProfile } from "@/types/roadmap";

type ActiveRoadmapResponse = {
  roadmap_id: number;
  roadmap: Roadmap;
  stats: RoadmapStats;
};

export default function RoadmapDashboardPage() {
  const token = useSessionStore((state) => state.accessToken);
  const { roadmap, roadmapStats, roadmapId, setRoadmap } = useRoadmapStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api<ActiveRoadmapResponse>("/api/roadmap/active", { token }),
      api<{ completed: boolean; profile: UserProfile | null }>("/api/onboarding/status", { token })
    ])
      .then(([active, status]) => {
        setRoadmap(active.roadmap, active.roadmap_id, active.stats);
        setProfile(status.profile);
        setOffline(false);
        setError("");
      })
      .catch((err) => {
        if (typeof navigator !== "undefined" && !navigator.onLine && useRoadmapStore.getState().roadmap) {
          setOffline(true);
        } else {
          setError(err instanceof Error ? err.message : "Could not load roadmap");
        }
      })
      .finally(() => setLoading(false));
  }, [setRoadmap, token]);

  async function updateStatus(moduleId: string, status: "in_progress" | "completed") {
    if (!token) return;
    const result = await api<ActiveRoadmapResponse>(`/api/roadmap/module/${moduleId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status })
    });
    setRoadmap(result.roadmap, result.roadmap_id, result.stats);
  }

  async function regenerate() {
    if (!token) return;
    setLoading(true);
    try {
      const result = await api<{ roadmap_id: number; roadmap: Roadmap; stats: RoadmapStats }>("/api/roadmap/regenerate", {
        method: "POST",
        token,
        body: JSON.stringify({ updates: {} })
      });
      setRoadmap(result.roadmap, result.roadmap_id, result.stats);
    } finally {
      setLoading(false);
    }
  }

  const activeRoadmap = roadmap;
  const activeStats = roadmapStats;

  return (
    <AppShell>
      <div className="-mx-4 -my-5 min-h-screen bg-mist dark:bg-gray-950 sm:-mx-6 lg:-mx-8">
        {loading && !activeRoadmap ? <RoadmapSkeleton /> : null}
        {offline ? <div className="bg-amber-100 px-6 py-3 text-sm font-medium text-amber-800">You are offline, showing last saved roadmap.</div> : null}
        {!loading && !activeRoadmap ? (
          <div className="grid min-h-screen place-items-center px-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h1 className="text-2xl font-semibold">You do not have a roadmap yet</h1>
              <Link className="focus-ring mt-5 inline-flex rounded-xl bg-teal px-5 py-3 font-semibold text-white" href="/onboarding">
                Complete Onboarding
              </Link>
              {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
            </div>
          </div>
        ) : null}
        {activeRoadmap && activeStats ? (
          <>
            <RoadmapHeader roadmap={activeRoadmap} stats={activeStats} profile={profile} onRegenerate={regenerate} />
            <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
              <div className="space-y-6">
                <PhaseTimeline phases={activeRoadmap.phases} onStatusChange={updateStatus} />
                <MilestoneTrack roadmap={activeRoadmap} />
              </div>
              <RoadmapSidebar roadmap={activeRoadmap} stats={activeStats} profile={profile} />
            </main>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-96 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
