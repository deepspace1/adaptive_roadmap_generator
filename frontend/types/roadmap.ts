export type ModuleStatus = "available" | "locked" | "in_progress" | "completed";

export type RoadmapResource = {
  type: "video" | "article" | "book" | "project" | "quiz";
  title: string;
  description: string;
};

export type RoadmapModule = {
  module_id: string;
  title: string;
  description: string;
  estimated_hours: number;
  difficulty: "easy" | "medium" | "hard";
  skills_taught: string[];
  prerequisites: string[];
  resources: RoadmapResource[];
  mastery_criteria: string;
  practice_project: string | null;
  status: ModuleStatus;
};

export type RoadmapPhase = {
  phase_number: number;
  phase_title: string;
  phase_goal: string;
  duration_weeks: number;
  color: string;
  modules: RoadmapModule[];
};

export type RoadmapMilestone = {
  id: string;
  title: string;
  description: string;
  target_week: number;
  badge_emoji: string;
  required_module_ids: string[];
};

export type Roadmap = {
  topic: string;
  user_level: string;
  total_duration_weeks: number;
  weekly_hours_commitment: number;
  summary: string;
  phases: RoadmapPhase[];
  milestones: RoadmapMilestone[];
  next_suggested_module: string;
};

export type RoadmapStats = {
  total_modules: number;
  completed_modules: number;
  in_progress_modules: number;
  completion_percentage: number;
  current_phase: number;
  current_phase_title?: string;
  estimated_completion_date: string;
  next_module_id?: string | null;
  next_module_title?: string | null;
  weekly_goal_hours?: number;
  hours_logged_this_week?: number;
  modules_completed_this_week?: number;
  learning_streak?: number;
};

export type UserProfile = {
  id: number;
  user_id: string;
  topic: string;
  goal: string;
  deadline: string;
  skill_level: string;
  prior_experience: string[];
  related_skills: string;
  daily_time_minutes: number;
  learning_style: string;
  pace: string;
  assessed_level: string;
  onboarding_completed: boolean;
  created_at: string;
};

export type OnboardingFormData = {
  topic: string;
  goal: string;
  deadline: string;
  skill_level: string;
  prior_experience: string[];
  related_skills: string;
  daily_time_minutes: number;
  learning_style: string;
  pace: string;
  assessed_level: string;
};

export type SkillAssessmentQuestion = {
  id: string;
  question: string;
  options: Record<"A" | "B" | "C" | "D", string>;
};
