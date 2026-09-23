import { describe, expect, it } from "vitest";
import { validateKit } from "./schema.js";

function validKit() {
  return {
    source: {
      company: "Acme",
      company_url: "https://acme.example.com",
      role: "Backend Engineer",
      location: "Remote",
      jd_chars: 500,
      researched_at: new Date().toISOString(),
      pages_used: ["https://acme.example.com/careers"],
    },
    company_brief: { summary: "s", what_they_do: "w", sources: [] },
    role: {
      title: "Backend Engineer",
      seniority: "Senior",
      responsibilities: ["Build things"],
      requirements: [{ id: "r1", text: "5+ years with Node.js", kind: "technical", priority: "must" }],
    },
    questions: [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "Explain the event loop",
        answer_outline: "Mentions call stack, task queue",
        difficulty: 2,
      },
    ],
    flashcards: [{ id: "f1", front: "What is the event loop?", back: "...", requirement_ids: ["r1"] }],
    schedule: { days_available: 1, days: [{ day: 1, focus: "Technical", question_ids: ["q1"], minutes: 25 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

describe("validateKit", () => {
  it("accepts a well-formed kit", () => {
    const result = validateKit(validKit());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a kit missing required top-level fields", () => {
    const kit = validKit() as any;
    delete kit.coverage;
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it("rejects a non-integer minutes value", () => {
    const kit = validKit() as any;
    kit.schedule.days[0].minutes = 25.5;
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it("rejects a schedule day referencing a question that doesn't exist", () => {
    const kit = validKit() as any;
    kit.schedule.days[0].question_ids.push("q-does-not-exist");
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/unknown question/);
  });

  it("rejects a question referencing an unknown requirement id", () => {
    const kit = validKit() as any;
    kit.questions[0].requirement_ids.push("r-does-not-exist");
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/unknown requirement/);
  });

  it("rejects an invalid priority value", () => {
    const kit = validKit() as any;
    kit.role.requirements[0].priority = "should";
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it("rejects when schedule day count does not match days_available", () => {
    const kit = validKit() as any;
    kit.schedule.days_available = 3;
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/days_available/);
  });
});
