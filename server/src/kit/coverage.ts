import type { Question, Requirement } from "./schema.js";

export interface CoverageResult {
  uncoveredRequirementIds: string[];
  uncoveredMustHaveIds: string[];
}

/**
 * Deterministic: a requirement is "covered" iff at least one question lists
 * its id in requirement_ids. This is intentionally not delegated to the
 * model — coverage has to be a fact the code can verify, not an opinion an
 * LLM asserts about its own output.
 */
export function checkCoverage(requirements: Requirement[], questions: Question[]): CoverageResult {
  const covered = new Set<string>();
  for (const question of questions) {
    for (const rid of question.requirement_ids) {
      covered.add(rid);
    }
  }

  const uncoveredRequirementIds = requirements.filter((r) => !covered.has(r.id)).map((r) => r.id);
  const uncoveredMustHaveIds = requirements
    .filter((r) => r.priority === "must" && !covered.has(r.id))
    .map((r) => r.id);

  return { uncoveredRequirementIds, uncoveredMustHaveIds };
}
