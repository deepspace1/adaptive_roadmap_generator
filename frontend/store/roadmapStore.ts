"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModuleStatus, OnboardingFormData, Roadmap, RoadmapStats } from "@/types/roadmap";

type RoadmapState = {
  onboardingCompleted: boolean;
  onboardingStep: number;
  onboardingData: Partial<OnboardingFormData>;
  roadmap: Roadmap | null;
  roadmapId: number | null;
  roadmapStats: RoadmapStats | null;
  moduleProgress: Record<string, ModuleStatus>;
  assessmentId: string | null;
  isGeneratingRoadmap: boolean;
  setOnboardingStep: (step: number) => void;
  updateOnboardingData: (partial: Partial<OnboardingFormData>) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setRoadmap: (roadmap: Roadmap | null, id: number | null, stats?: RoadmapStats | null) => void;
  updateModuleStatus: (moduleId: string, status: ModuleStatus) => void;
  setAssessmentId: (assessmentId: string | null) => void;
  setGenerating: (generating: boolean) => void;
  resetOnboarding: () => void;
};

const defaultOnboardingData: Partial<OnboardingFormData> = {
  deadline: "3 months",
  skill_level: "beginner",
  daily_time_minutes: 30,
  learning_style: "interactive",
  pace: "balanced",
  prior_experience: []
};

function progressFromRoadmap(roadmap: Roadmap | null): Record<string, ModuleStatus> {
  if (!roadmap) return {};
  return Object.fromEntries(roadmap.phases.flatMap((phase) => phase.modules.map((module) => [module.module_id, module.status])));
}

function unlockModules(roadmap: Roadmap, progress: Record<string, ModuleStatus>): Roadmap {
  const nextRoadmap = {
    ...roadmap,
    phases: roadmap.phases.map((phase) => ({
      ...phase,
      modules: phase.modules.map((module) => ({ ...module }))
    }))
  };
  const completed = new Set(Object.entries(progress).filter(([, status]) => status === "completed").map(([moduleId]) => moduleId));
  for (const module of nextRoadmap.phases.flatMap((phase) => phase.modules)) {
    const storedStatus = progress[module.module_id];
    if (storedStatus) module.status = storedStatus;
    if (module.status === "locked" && module.prerequisites.every((moduleId) => completed.has(moduleId))) {
      module.status = "available";
      progress[module.module_id] = "available";
    }
  }
  return nextRoadmap;
}

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => ({
      onboardingCompleted: false,
      onboardingStep: 1,
      onboardingData: defaultOnboardingData,
      roadmap: null,
      roadmapId: null,
      roadmapStats: null,
      moduleProgress: {},
      assessmentId: null,
      isGeneratingRoadmap: false,
      setOnboardingStep: (step) => set({ onboardingStep: Math.min(4, Math.max(1, step)) }),
      updateOnboardingData: (partial) => set((state) => ({ onboardingData: { ...state.onboardingData, ...partial } })),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setRoadmap: (roadmap, id, stats = null) =>
        set({
          roadmap,
          roadmapId: id,
          roadmapStats: stats,
          onboardingCompleted: Boolean(roadmap),
          moduleProgress: progressFromRoadmap(roadmap)
        }),
      updateModuleStatus: (moduleId, status) =>
        set((state) => {
          const moduleProgress = { ...state.moduleProgress, [moduleId]: status };
          const roadmap = state.roadmap ? unlockModules(state.roadmap, moduleProgress) : state.roadmap;
          return { moduleProgress, roadmap };
        }),
      setAssessmentId: (assessmentId) => set({ assessmentId }),
      setGenerating: (generating) => set({ isGeneratingRoadmap: generating }),
      resetOnboarding: () =>
        set({
          onboardingCompleted: false,
          onboardingStep: 1,
          onboardingData: defaultOnboardingData,
          roadmap: null,
          roadmapId: null,
          roadmapStats: null,
          moduleProgress: {},
          assessmentId: null,
          isGeneratingRoadmap: false
        })
    }),
    {
      name: "roadmap-store",
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
        roadmap: state.roadmap,
        roadmapId: state.roadmapId,
        moduleProgress: state.moduleProgress
      })
    }
  )
);

export function requiredOnboardingData(data: Partial<OnboardingFormData>): OnboardingFormData {
  return {
    topic: data.topic || "",
    goal: data.goal || "",
    deadline: data.deadline || "3 months",
    skill_level: data.skill_level || "beginner",
    prior_experience: data.prior_experience || [],
    related_skills: data.related_skills || "",
    daily_time_minutes: data.daily_time_minutes || 30,
    learning_style: data.learning_style || "interactive",
    pace: data.pace || "balanced",
    assessed_level: data.assessed_level || data.skill_level || "beginner"
  };
}
