import { z } from "zod";

// Mirrors Appendix A of the assessment brief exactly. Field names and nesting
// must not change — the batch pipeline and automated grading depend on this.

export const requirementKindSchema = z.enum(["technical", "behavioural", "domain"]);
export const prioritySchema = z.enum(["must", "nice"]);
export const questionCategorySchema = z.enum([
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
]);

export const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: requirementKindSchema,
  priority: prioritySchema,
});

export const questionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: questionCategorySchema,
  prompt: z.string().min(1),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
});

export const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()),
});

export const scheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(0),
});

export const scheduleSchema = z.object({
  days_available: z.number().int().min(1),
  days: z.array(scheduleDaySchema),
});

export const coverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().min(0),
});

export const kitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int().min(0),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(requirementSchema),
  }),
  questions: z.array(questionSchema),
  flashcards: z.array(flashcardSchema),
  schedule: scheduleSchema,
  coverage: coverageSchema,
});

export type Kit = z.infer<typeof kitSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;
export type ScheduleDay = z.infer<typeof scheduleDaySchema>;

export interface KitValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Structural validation plus referential-integrity checks the zod shape alone
 * can't express: every schedule.question_ids entry must reference a real
 * question, every question.requirement_ids entry a real requirement.
 */
export function validateKit(candidate: unknown): KitValidationResult {
  const parsed = kitSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const kit = parsed.data;
  const errors: string[] = [];
  const requirementIds = new Set(kit.role.requirements.map((r) => r.id));
  const questionIds = new Set(kit.questions.map((q) => q.id));

  for (const question of kit.questions) {
    for (const rid of question.requirement_ids) {
      if (!requirementIds.has(rid)) {
        errors.push(`question ${question.id} references unknown requirement ${rid}`);
      }
    }
  }

  for (const card of kit.flashcards) {
    for (const rid of card.requirement_ids) {
      if (!requirementIds.has(rid)) {
        errors.push(`flashcard ${card.id} references unknown requirement ${rid}`);
      }
    }
  }

  for (const day of kit.schedule.days) {
    for (const qid of day.question_ids) {
      if (!questionIds.has(qid)) {
        errors.push(`schedule day ${day.day} references unknown question ${qid}`);
      }
    }
  }

  if (kit.schedule.days.length !== kit.schedule.days_available) {
    errors.push(
      `schedule has ${kit.schedule.days.length} days but days_available is ${kit.schedule.days_available}`,
    );
  }

  return { valid: errors.length === 0, errors };
}
