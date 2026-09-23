import { describe, expect, it } from "vitest";
import { buildSchedule } from "./scheduler.js";
import type { Question, Requirement } from "./schema.js";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}

function q(id: string, requirementIds: string[], difficulty = 2): Question {
  return {
    id,
    requirement_ids: requirementIds,
    category: "technical",
    prompt: `prompt ${id}`,
    answer_outline: "",
    difficulty,
  };
}

describe("buildSchedule", () => {
  it("produces exactly the number of days requested", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"]), q("q3", ["r3"])];
    const schedule = buildSchedule(requirements, questions, 5);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days).toHaveLength(5);
    expect(schedule.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
  });

  it("places every question in exactly one day", () => {
    const requirements = [req("r1"), req("r2"), req("r3"), req("r4")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"]), q("q3", ["r3"]), q("q4", ["r4"])];
    const schedule = buildSchedule(requirements, questions, 2);
    const scheduledIds = schedule.days.flatMap((d) => d.question_ids);
    expect(scheduledIds.sort()).toEqual(["q1", "q2", "q3", "q4"]);
  });

  it("puts every must-have requirement's question somewhere in the schedule", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"])];
    const schedule = buildSchedule(requirements, questions, 3);
    const scheduledIds = new Set(schedule.days.flatMap((d) => d.question_ids));
    expect(scheduledIds.has("q1")).toBe(true);
  });

  it("orders harder/must-have material into earlier days", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions = [q("hard", ["r1"], 3), q("easy", ["r2"], 1)];
    const schedule = buildSchedule(requirements, questions, 2);
    expect(schedule.days[0].question_ids).toContain("hard");
    expect(schedule.days[1].question_ids).toContain("easy");
  });

  it("handles a single-day schedule by packing everything into day 1", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"])];
    const schedule = buildSchedule(requirements, questions, 1);
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0].question_ids.sort()).toEqual(["q1", "q2"]);
  });

  it("pads extra days with spaced review when there are more days than questions", () => {
    const requirements = [req("r1")];
    const questions = [q("q1", ["r1"])];
    const schedule = buildSchedule(requirements, questions, 10);
    expect(schedule.days).toHaveLength(10);
    expect(schedule.days[0].question_ids).toContain("q1");
    expect(schedule.days[9].focus.toLowerCase()).toContain("review");
    expect(schedule.days.every((d) => Number.isInteger(d.minutes))).toBe(true);
  });

  it("returns empty but well-formed days when there are no questions at all", () => {
    const schedule = buildSchedule([], [], 3);
    expect(schedule.days).toHaveLength(3);
    expect(schedule.days.every((d) => d.question_ids.length === 0)).toBe(true);
  });
});
