"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";

export default function HomePage() {
  const router = useRouter();
  const { hydrate, accessToken, hydrated } = useSessionStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? "/dashboard" : "/login");
  }, [accessToken, hydrated, router]);

  return <main className="min-h-screen" />;
}
