import type { Kit, Question, QuestionCategory as SchemaCategory, Requirement } from "../kit/schema.js";
import type { ItemSource } from "../models/Kit.js";
import { checkCoverage } from "../kit/coverage.js";
import { buildSchedule } from "../kit/scheduler.js";
import {
  generateQuestionsForRequirement,
  primaryCategoryForKind,
  type QuestionCategory,
} from "./generateQuestions.js";
import { generateCompanyBrief } from "./companyBrief.js";
import { crawlCompanySite } from "../retrieval/crawler.js";
import { searchPublicDiscussion } from "../retrieval/search.js";

function nextQuestionId(existing: Question[]): string {
  const maxN = existing.reduce((max, q) => {
    const n = Number(q.id.replace(/^q/, ""));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `q${maxN + 1}`;
}

/**
 * Regenerates one question category. Questions the user hand-wrote or
 * edited (itemState 'manual' | 'edited') are never touched — only
 * machine-generated, untouched questions in that category are replaced.
 * Requirements already covered by a preserved question in this category are
 * skipped so regeneration doesn't create duplicate coverage.
 */
export async function regenerateQuestionCategory(
  kit: Kit,
  itemState: Record<string, ItemSource>,
  category: QuestionCategory,
  companyContext: string,
): Promise<{ questions: Question[]; itemState: Record<string, ItemSource> }> {
  const preserved = kit.questions.filter(
    (q) => q.category === category && itemState[q.id] && itemState[q.id] !== "generated",
  );
  const otherCategories = kit.questions.filter((q) => q.category !== category);
  const preservedRequirementIds = new Set(preserved.flatMap((q) => q.requirement_ids));

  const requirementsToRegenerate = kit.role.requirements.filter((r: Requirement) => {
    const belongsToCategory =
      primaryCategoryForKind(r.kind) === category ||
      (category === "system-design" && r.kind === "technical");
    return belongsToCategory && !preservedRequirementIds.has(r.id);
  });

  const freshQuestions: Question[] = [];
  const nextItemState = { ...itemState };

  for (const requirement of requirementsToRegenerate) {
    const generated = await generateQuestionsForRequirement(requirement, category, companyContext, 1);
    for (const g of generated) {
      const id = nextQuestionId([...otherCategories, ...preserved, ...freshQuestions]);
      freshQuestions.push({
        id,
        requirement_ids: [requirement.id],
        category: category as SchemaCategory,
        prompt: g.prompt,
        answer_outline: g.answer_outline,
        difficulty: g.difficulty,
      });
      nextItemState[id] = "generated";
    }
  }

  const questions = [...otherCategories, ...preserved, ...freshQuestions];
  return { questions, itemState: nextItemState };
}

/** Re-crawls the company site and rewrites the brief. This is the one
 * section without per-field pinning: regenerating it is an explicit,
 * whole-section replace, same as the brief's initial generation. */
export async function regenerateCompanyBrief(
  companyName: string,
  companyUrl: string,
): Promise<{ companyName: string; summary: string; what_they_do: string; sources: string[] }> {
  const crawl = await crawlCompanySite(companyUrl).catch(() => ({
    pages: [],
    skipped: [],
    hiringPageFound: false,
  }));
  const search = await searchPublicDiscussion(companyName);
  const brief = await generateCompanyBrief(companyName, crawl.pages, search.results);
  return {
    companyName: brief.companyName,
    summary: brief.summary,
    what_they_do: brief.what_they_do,
    sources: [...crawl.pages.map((p) => p.url), ...search.results.map((r) => r.url)],
  };
}

export function recomputeCoverageAndSchedule(kit: Kit): Kit {
  const coverage = checkCoverage(kit.role.requirements, kit.questions);
  const schedule = buildSchedule(kit.role.requirements, kit.questions, kit.schedule.days_available);
  return {
    ...kit,
    coverage: { uncovered_requirement_ids: coverage.uncoveredRequirementIds, passes: kit.coverage.passes },
    schedule,
  };
}
