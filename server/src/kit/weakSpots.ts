import type { Flashcard, Question, Requirement } from "./schema.js";

export type WeakSpotStatus = "uncovered" | "unreviewed" | "needs-work" | "solid";

export interface WeakSpotItem {
  requirementId: string;
  text: string;
  kind: Requirement["kind"];
  priority: Requirement["priority"];
  status: WeakSpotStatus;
  questionCount: number;
  flashcardIds: string[];
  latestConfidence: number | null;
  /** 0 (rock solid) to 100 (worst) — used only for ranking/display. */
  riskScore: number;
}

export interface WeakSpotsReport {
  /** 0-100. 100 = every requirement covered and confidently reviewed. */
  readinessScore: number;
  items: WeakSpotItem[];
}

export interface PracticeEntry {
  cardId: string;
  confidence: number;
  reviewedAt: Date | string;
}

function latestConfidenceByCard(practice: PracticeEntry[]): Map<string, number> {
  const latest = new Map<string, { confidence: number; at: number }>();
  for (const entry of practice) {
    const at = new Date(entry.reviewedAt).getTime();
    const existing = latest.get(entry.cardId);
    if (!existing || at >= existing.at) {
      latest.set(entry.cardId, { confidence: entry.confidence, at });
    }
  }
  return new Map([...latest].map(([id, v]) => [id, v.confidence]));
}

/**
 * A "gap" of 0 means fully solid, 5 means as bad as it gets (never
 * reviewed and confidence would be 1 if it were). This is the same 1-5
 * confidence scale practice mode already uses, just inverted so bigger
 * always means "needs more work" — kept as one unit so the score and the
 * practice-mode ordering never contradict each other.
 */
function gapFor(status: WeakSpotStatus, avgConfidence: number | null): number {
  if (status === "uncovered") return 5;
  if (status === "unreviewed") return 3.5;
  return 5 - (avgConfidence ?? 3);
}

function statusFor(covered: boolean, avgConfidence: number | null): WeakSpotStatus {
  if (!covered) return "uncovered";
  if (avgConfidence === null) return "unreviewed";
  if (avgConfidence <= 2.5) return "needs-work";
  return "solid";
}

/**
 * Deterministic — no model call. Reuses two things the pipeline already
 * computes: coverage (does a requirement have a question) and practice
 * confidence (how the user rated themselves on cards tied to that
 * requirement). Neither the coverage checker nor practice mode look at the
 * other; this is the one place that combines them into a single ranked
 * "what should I actually worry about" view, weighted so a missing or shaky
 * must-have always outranks a shaky nice-to-have.
 */
export function computeWeakSpots(
  requirements: Requirement[],
  questions: Question[],
  flashcards: Flashcard[],
  practice: PracticeEntry[],
): WeakSpotsReport {
  const confidenceByCard = latestConfidenceByCard(practice);

  const questionsByRequirement = new Map<string, number>();
  for (const q of questions) {
    for (const rid of q.requirement_ids) {
      questionsByRequirement.set(rid, (questionsByRequirement.get(rid) ?? 0) + 1);
    }
  }

  const flashcardsByRequirement = new Map<string, Flashcard[]>();
  for (const card of flashcards) {
    for (const rid of card.requirement_ids) {
      const list = flashcardsByRequirement.get(rid) ?? [];
      list.push(card);
      flashcardsByRequirement.set(rid, list);
    }
  }

  let weightedGapSum = 0;
  let weightedMaxSum = 0;

  const items: WeakSpotItem[] = requirements.map((r) => {
    const questionCount = questionsByRequirement.get(r.id) ?? 0;
    const covered = questionCount > 0;
    const cards = flashcardsByRequirement.get(r.id) ?? [];
    const reviewedConfidences = cards
      .map((c) => confidenceByCard.get(c.id))
      .filter((c): c is number => c !== undefined);
    const avgConfidence = reviewedConfidences.length
      ? reviewedConfidences.reduce((a, b) => a + b, 0) / reviewedConfidences.length
      : null;

    const status = statusFor(covered, avgConfidence);
    const gap = gapFor(status, avgConfidence);
    const weight = r.priority === "must" ? 2 : 1;

    weightedGapSum += gap * weight;
    weightedMaxSum += 5 * weight;

    return {
      requirementId: r.id,
      text: r.text,
      kind: r.kind,
      priority: r.priority,
      status,
      questionCount,
      flashcardIds: cards.map((c) => c.id),
      latestConfidence: avgConfidence,
      riskScore: Math.round((gap / 5) * 100),
    };
  });

  items.sort((a, b) => b.riskScore - a.riskScore || (a.priority === "must" ? -1 : 1));

  const readinessScore =
    weightedMaxSum === 0 ? 100 : Math.round(100 * (1 - weightedGapSum / weightedMaxSum));

  return { readinessScore, items };
}
