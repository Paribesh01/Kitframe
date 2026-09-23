import type { Question, Requirement, ScheduleDay } from "./schema.js";

const MINUTES_BY_DIFFICULTY: Record<number, number> = { 1: 15, 2: 25, 3: 40 };
const REVIEW_DAY_MINUTES = 20;

function questionMinutes(question: Question): number {
  return MINUTES_BY_DIFFICULTY[question.difficulty] ?? 20;
}

function priorityWeight(question: Question, requirementById: Map<string, Requirement>): number {
  const priorities = question.requirement_ids
    .map((id) => requirementById.get(id)?.priority)
    .filter(Boolean);
  return priorities.includes("must") ? 0 : 1;
}

/**
 * Sorts hardest, highest-priority material first so it lands earliest in the
 * schedule, then greedily bin-packs questions into `daysAvailable` buckets by
 * target minutes-per-day. If there are more days than there is material, the
 * remaining days become spaced-review days that re-cycle earlier questions
 * rather than sitting empty. This is pure arithmetic/allocation — no model
 * call is involved, per the brief's requirement that scheduling be
 * deterministic.
 */
export function buildSchedule(
  requirements: Requirement[],
  questions: Question[],
  daysAvailable: number,
): { days_available: number; days: ScheduleDay[] } {
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const sorted = [...questions].sort((a, b) => {
    const priorityDiff = priorityWeight(a, requirementById) - priorityWeight(b, requirementById);
    if (priorityDiff !== 0) return priorityDiff;
    return b.difficulty - a.difficulty;
  });

  const days: ScheduleDay[] = [];

  if (sorted.length === 0) {
    for (let d = 1; d <= daysAvailable; d++) {
      days.push({ day: d, focus: "No material generated yet", question_ids: [], minutes: 0 });
    }
    return { days_available: daysAvailable, days };
  }

  const totalMinutes = sorted.reduce((sum, q) => sum + questionMinutes(q), 0);
  const materialDays = Math.min(daysAvailable, sorted.length);
  const targetPerDay = Math.max(1, Math.round(totalMinutes / materialDays));

  const buckets: Question[][] = Array.from({ length: materialDays }, () => []);
  let bucketIndex = 0;
  let bucketMinutes = 0;

  for (const question of sorted) {
    const remainingBuckets = materialDays - bucketIndex - 1;
    const remainingQuestions = sorted.length - sorted.indexOf(question);
    const mustFlush =
      bucketMinutes > 0 && bucketMinutes + questionMinutes(question) > targetPerDay * 1.4;
    const mustReserve = remainingBuckets > 0 && remainingQuestions <= remainingBuckets;

    if (bucketIndex < materialDays - 1 && (mustFlush || mustReserve) && buckets[bucketIndex].length > 0) {
      bucketIndex += 1;
      bucketMinutes = 0;
    }

    buckets[Math.min(bucketIndex, materialDays - 1)].push(question);
    bucketMinutes += questionMinutes(question);
  }

  for (let i = 0; i < materialDays; i++) {
    const dayQuestions = buckets[i];
    const categories = [...new Set(dayQuestions.map((q) => q.category))];
    days.push({
      day: i + 1,
      focus: categories.length > 0 ? `Focus: ${categories.join(", ")}` : "Review",
      question_ids: dayQuestions.map((q) => q.id),
      minutes: dayQuestions.reduce((sum, q) => sum + questionMinutes(q), 0),
    });
  }

  // More days than material: pad with spaced-review days cycling earlier
  // questions at a lighter load, biased toward the ones the user saw first
  // (which were the hardest/highest-priority).
  for (let d = materialDays + 1; d <= daysAvailable; d++) {
    const reviewSource = sorted[(d - materialDays - 1) % sorted.length];
    days.push({
      day: d,
      focus: "Spaced review of earlier material",
      question_ids: [reviewSource.id],
      minutes: REVIEW_DAY_MINUTES,
    });
  }

  return { days_available: daysAvailable, days };
}
