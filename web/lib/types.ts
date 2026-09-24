export type RequirementKind = "technical" | "behavioural" | "domain";
export type Priority = "must" | "nice";
export type QuestionCategory = "technical" | "behavioural" | "system-design" | "company-fit";
export type ItemSource = "generated" | "edited" | "manual";

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: Priority;
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Kit {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: { summary: string; what_they_do: string; sources: string[] };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: { days_available: number; days: ScheduleDay[] };
  coverage: { uncovered_requirement_ids: string[]; passes: number };
}

export interface KitSummary {
  id: string;
  status: "pending" | "generating" | "ready" | "failed";
  company: string;
  role: string;
  daysAvailable: number;
  createdAt: string;
  updatedAt: string;
  error: { code: string; message: string } | null;
  readinessScore: number | null;
}

export type WeakSpotStatus = "uncovered" | "unreviewed" | "needs-work" | "solid";

export interface WeakSpotItem {
  requirementId: string;
  text: string;
  kind: RequirementKind;
  priority: Priority;
  status: WeakSpotStatus;
  questionCount: number;
  flashcardIds: string[];
  latestConfidence: number | null;
  riskScore: number;
}

export interface WeakSpotsReport {
  readinessScore: number;
  items: WeakSpotItem[];
}

export interface KitDetail {
  id: string;
  status: "pending" | "generating" | "ready" | "failed";
  progress: { step: string; message: string; at: string }[];
  error: { code: string; message: string } | null;
  kit: Kit | null;
  itemState: Record<string, ItemSource>;
  practice: { cardId: string; confidence: number; reviewedAt: string }[];
  readinessScore: number | null;
  daysAvailable: number;
  companyUrl: string;
  createdAt: string;
  updatedAt: string;
}
