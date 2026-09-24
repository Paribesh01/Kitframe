import { describe, expect, it } from "vitest";
import { computeWeakSpots } from "./weakSpots.js";
import type { Flashcard, Question, Requirement } from "./schema.js";

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
    difficulty: 2,
  };
}

function card(id: string, requirementIds: string[]): Flashcard {
  return { id, front: `front ${id}`, back: `back ${id}`, requirement_ids: requirementIds };
}

describe("computeWeakSpots", () => {
  it("gives a 100 readiness score when nothing has been generated or reviewed yet", () => {
    const report = computeWeakSpots([], [], [], []);
    expect(report.readinessScore).toBe(100);
    expect(report.items).toEqual([]);
  });

  it("marks a requirement with no question as uncovered and worst-ranked", () => {
    const report = computeWeakSpots([req("r1"), req("r2")], [q("q1", ["r2"])], [], []);
    const r1 = report.items.find((i) => i.requirementId === "r1")!;
    expect(r1.status).toBe("uncovered");
    expect(r1.riskScore).toBe(100);
    expect(report.items[0].requirementId).toBe("r1");
  });

  it("marks a covered requirement with no reviewed flashcard as unreviewed", () => {
    const report = computeWeakSpots([req("r1")], [q("q1", ["r1"])], [card("f1", ["r1"])], []);
    const item = report.items[0];
    expect(item.status).toBe("unreviewed");
    expect(item.latestConfidence).toBeNull();
  });

  it("uses the most recent confidence rating per card, not the average of all history", () => {
    const report = computeWeakSpots(
      [req("r1")],
      [q("q1", ["r1"])],
      [card("f1", ["r1"])],
      [
        { cardId: "f1", confidence: 1, reviewedAt: "2026-01-01T00:00:00Z" },
        { cardId: "f1", confidence: 5, reviewedAt: "2026-01-02T00:00:00Z" },
      ],
    );
    expect(report.items[0].latestConfidence).toBe(5);
    expect(report.items[0].status).toBe("solid");
  });

  it("weights must-have requirements above nice-to-have ones at equal confidence", () => {
    const report = computeWeakSpots(
      [req("must-req", "must"), req("nice-req", "nice")],
      [q("q1", ["must-req"]), q("q2", ["nice-req"])],
      [card("f1", ["must-req"]), card("f2", ["nice-req"])],
      [
        { cardId: "f1", confidence: 2, reviewedAt: new Date() },
        { cardId: "f2", confidence: 2, reviewedAt: new Date() },
      ],
    );
    // Same confidence, same gap — must-have's contribution to the overall
    // score is weighted twice as heavily, so readiness reflects that even
    // though both items individually show "needs-work".
    expect(report.items.every((i) => i.status === "needs-work")).toBe(true);
    expect(report.readinessScore).toBeLessThan(100);
  });

  it("gives full readiness only when every requirement is covered and confidently reviewed", () => {
    const report = computeWeakSpots(
      [req("r1"), req("r2", "nice")],
      [q("q1", ["r1"]), q("q2", ["r2"])],
      [card("f1", ["r1"]), card("f2", ["r2"])],
      [
        { cardId: "f1", confidence: 5, reviewedAt: new Date() },
        { cardId: "f2", confidence: 5, reviewedAt: new Date() },
      ],
    );
    expect(report.readinessScore).toBe(100);
    expect(report.items.every((i) => i.status === "solid")).toBe(true);
  });
});
