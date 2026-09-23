import { describe, expect, it } from "vitest";
import { checkCoverage } from "./coverage.js";
import type { Question, Requirement } from "./schema.js";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}

function q(id: string, requirementIds: string[]): Question {
  return {
    id,
    requirement_ids: requirementIds,
    category: "technical",
    prompt: `prompt ${id}`,
    answer_outline: "",
    difficulty: 1,
  };
}

describe("checkCoverage", () => {
  it("reports no gaps when every requirement has a question", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"])];
    const result = checkCoverage(requirements, questions);
    expect(result.uncoveredRequirementIds).toEqual([]);
    expect(result.uncoveredMustHaveIds).toEqual([]);
  });

  it("flags requirements with no covering question", () => {
    const requirements = [req("r1"), req("r2", "nice")];
    const questions = [q("q1", ["r1"])];
    const result = checkCoverage(requirements, questions);
    expect(result.uncoveredRequirementIds).toEqual(["r2"]);
  });

  it("separates must-have gaps from nice-to-have gaps", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions: Question[] = [];
    const result = checkCoverage(requirements, questions);
    expect(result.uncoveredRequirementIds.sort()).toEqual(["r1", "r2"]);
    expect(result.uncoveredMustHaveIds).toEqual(["r1"]);
  });

  it("counts a requirement covered even when the question covers multiple requirements", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1", "r2"])];
    const result = checkCoverage(requirements, questions);
    expect(result.uncoveredRequirementIds).toEqual([]);
  });
});
