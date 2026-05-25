"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { Step1Topic } from "@/components/onboarding/Step1Topic";
import { Step2Background } from "@/components/onboarding/Step2Background";
import { Step3Preferences } from "@/components/onboarding/Step3Preferences";
import { Step4Assessment } from "@/components/onboarding/Step4Assessment";
import { useRoadmapStore } from "@/store/roadmapStore";
import { useSessionStore } from "@/store/session";
import type { UserProfile } from "@/types/roadmap";

export default function OnboardingPage() {
  const router = useRouter();
  const { hydrate, hydrated, accessToken } = useSessionStore();
  const { onboardingCompleted, onboardingStep, onboardingData, setOnboardingStep, updateOnboardingData, setOnboardingCompleted } = useRoadmapStore();
  const [checking, setChecking] = useState(true);
  const editMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("edit") === "1";

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    api<{ completed: boolean; profile: UserProfile | null }>("/api/onboarding/status", { token: accessToken })
      .then((result) => {
        setOnboardingCompleted(result.completed);
        if (result.profile) {
          updateOnboardingData({
            topic: result.profile.topic,
            goal: result.profile.goal,
            deadline: result.profile.deadline,
            skill_level: result.profile.skill_level,
            prior_experience: result.profile.prior_experience,
            related_skills: result.profile.related_skills,
            daily_time_minutes: result.profile.daily_time_minutes,
            learning_style: result.profile.learning_style,
            pace: result.profile.pace,
            assessed_level: result.profile.assessed_level
          });
        }
        if (editMode) {
          setOnboardingStep(3);
        } else if (result.completed) {
          router.replace("/dashboard/roadmap");
        }
      })
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, [accessToken, editMode, hydrated, router, setOnboardingCompleted, setOnboardingStep, updateOnboardingData]);

  useEffect(() => {
    if (onboardingCompleted && !editMode) router.replace("/dashboard/roadmap");
  }, [editMode, onboardingCompleted, router]);

  const canContinue = useMemo(() => {
    if (onboardingStep === 1) return Boolean(onboardingData.topic?.trim() && onboardingData.goal && onboardingData.deadline);
    if (onboardingStep === 2) return Boolean(onboardingData.skill_level && (onboardingData.prior_experience || []).length > 0);
    if (onboardingStep === 3) return Boolean(onboardingData.daily_time_minutes && onboardingData.learning_style && onboardingData.pace);
    return true;
  }, [onboardingData, onboardingStep]);

  if (checking || !hydrated) {
    return <main className="min-h-screen animate-pulse bg-mist dark:bg-gray-950" />;
  }

  return (
    <OnboardingLayout
      step={onboardingStep}
      canContinue={canContinue}
      onBack={() => setOnboardingStep(onboardingStep - 1)}
      onNext={() => setOnboardingStep(onboardingStep + 1)}
    >
      {onboardingStep === 1 ? <Step1Topic data={onboardingData} onChange={updateOnboardingData} /> : null}
      {onboardingStep === 2 ? <Step2Background data={onboardingData} onChange={updateOnboardingData} /> : null}
      {onboardingStep === 3 ? <Step3Preferences data={onboardingData} onChange={updateOnboardingData} /> : null}
      {onboardingStep === 4 ? <Step4Assessment data={onboardingData} /> : null}
    </OnboardingLayout>
  );
}
