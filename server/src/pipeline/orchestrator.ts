import { randomUUID } from "node:crypto";
import type { Kit, Question, Requirement } from "../kit/schema.js";
import { validateKit } from "../kit/schema.js";
import { checkCoverage } from "../kit/coverage.js";
import { buildSchedule } from "../kit/scheduler.js";
import { crawlCompanySite } from "../retrieval/crawler.js";
import { searchPublicDiscussion } from "../retrieval/search.js";
import { extractRequirements } from "./extractRequirements.js";
import { generateCompanyBrief } from "./companyBrief.js";
import {
  generateQuestionsForRequirement,
  primaryCategoryForKind,
  type QuestionCategory,
} from "./generateQuestions.js";
import { generateFlashcards } from "./generateFlashcards.js";

export interface GenerateKitInput {
  jobDescription: string;
  companyUrl: string;
  daysAvailable: number;
}

export interface GenerationProgressEvent {
  step: string;
  message: string;
}

export type ProgressReporter = (event: GenerationProgressEvent) => void;

const MAX_COVERAGE_PASSES = 3;

function inferCompanyName(companyUrl: string): string {
  try {
    const host = new URL(companyUrl).hostname.replace(/^www\./, "");
    return host.split(".")[0];
  } catch {
    return companyUrl;
  }
}

function extraCategoriesFor(requirement: Requirement, hiringProcessNotes: string): QuestionCategory[] {
  const categories: QuestionCategory[] = [primaryCategoryForKind(requirement.kind)];
  const notesLower = hiringProcessNotes.toLowerCase();
  const mentionsSystemDesign = notesLower.includes("system design") || notesLower.includes("system-design");
  if (requirement.kind === "technical" && requirement.priority === "must" && mentionsSystemDesign) {
    categories.push("system-design");
  }
  return categories;
}

/**
 * Runs the full retrieval -> generation -> coverage -> schedule pipeline.
 * This is the single implementation used by both the web app and the batch
 * evaluate command (Section 9), so their behaviour never diverges.
 */
export async function generateKit(
  input: GenerateKitInput,
  report: ProgressReporter = () => {},
): Promise<Kit> {
  const { jobDescription, companyUrl, daysAvailable } = input;

  report({ step: "extract_requirements", message: "Extracting requirements from job description" });
  const extracted = await extractRequirements(jobDescription);

  report({ step: "crawl_company", message: `Crawling ${companyUrl}` });
  const crawl = await crawlCompanySite(companyUrl).catch(() => ({
    pages: [],
    skipped: [{ url: companyUrl, reason: "Crawl failed" }],
    hiringPageFound: false,
  }));

  const companyName = inferCompanyName(companyUrl);

  report({ step: "search_discussion", message: `Searching for public discussion of ${companyName}` });
  const search = await searchPublicDiscussion(companyName);

  report({ step: "company_brief", message: "Writing company brief" });
  const brief = await generateCompanyBrief(companyName, crawl.pages, search.results);

  report({ step: "generate_questions", message: "Generating interview questions" });
  const questions: Question[] = [];
  let questionCounter = 1;

  for (const requirement of extracted.requirements) {
    const categories = extraCategoriesFor(requirement, brief.hiringProcessNotes);
    for (const category of categories) {
      const generated = await generateQuestionsForRequirement(
        requirement,
        category,
        brief.what_they_do,
        1,
      );
      for (const g of generated) {
        questions.push({
          id: `q${questionCounter++}`,
          requirement_ids: [requirement.id],
          category,
          prompt: g.prompt,
          answer_outline: g.answer_outline,
          difficulty: g.difficulty,
        });
      }
    }
  }

  report({ step: "coverage_check", message: "Checking requirement coverage" });
  let passes = 1;
  let coverage = checkCoverage(extracted.requirements, questions);

  while (coverage.uncoveredMustHaveIds.length > 0 && passes < MAX_COVERAGE_PASSES) {
    report({
      step: "coverage_gap_fill",
      message: `Pass ${passes + 1}: filling ${coverage.uncoveredMustHaveIds.length} coverage gap(s)`,
    });

    for (const reqId of coverage.uncoveredMustHaveIds) {
      const requirement = extracted.requirements.find((r) => r.id === reqId);
      if (!requirement) continue;
      const category = primaryCategoryForKind(requirement.kind);
      const generated = await generateQuestionsForRequirement(
        requirement,
        category,
        brief.what_they_do,
        1,
      );
      for (const g of generated) {
        questions.push({
          id: `q${questionCounter++}`,
          requirement_ids: [requirement.id],
          category,
          prompt: g.prompt,
          answer_outline: g.answer_outline,
          difficulty: g.difficulty,
        });
      }
    }

    passes += 1;
    coverage = checkCoverage(extracted.requirements, questions);
  }

  report({ step: "flashcards", message: "Generating flashcards" });
  const flashcardDrafts = await generateFlashcards(extracted.requirements, questions).catch(() => []);
  const flashcards = flashcardDrafts.map((f, i) => ({
    id: `f${i + 1}`,
    front: f.front,
    back: f.back,
    requirement_ids: f.requirement_ids,
  }));

  report({ step: "schedule", message: "Building study schedule" });
  const schedule = buildSchedule(extracted.requirements, questions, daysAvailable);

  const kit: Kit = {
    source: {
      company: companyName,
      company_url: companyUrl,
      role: extracted.title,
      location: "",
      jd_chars: jobDescription.length,
      researched_at: new Date().toISOString(),
      pages_used: crawl.pages.map((p) => p.url),
    },
    company_brief: {
      summary: brief.summary,
      what_they_do: brief.what_they_do,
      sources: [...crawl.pages.map((p) => p.url), ...search.results.map((r) => r.url)],
    },
    role: {
      title: extracted.title,
      seniority: extracted.seniority,
      responsibilities: extracted.responsibilities,
      requirements: extracted.requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids: coverage.uncoveredRequirementIds,
      passes,
    },
  };

  const validation = validateKit(kit);
  if (!validation.valid) {
    throw new Error(`Generated kit failed structural validation: ${validation.errors.join("; ")}`);
  }

  return kit;
}

export function newKitId(): string {
  return randomUUID();
}
