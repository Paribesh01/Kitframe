import { Router } from "express";
import { z } from "zod";
import { KitModel, computeDedupeKey, type ItemSource } from "../models/Kit.js";
import { requireAuth } from "../auth/middleware.js";
import { generateKit } from "../pipeline/orchestrator.js";
import { validateKit, type Kit, type Question } from "../kit/schema.js";
import { computeWeakSpots } from "../kit/weakSpots.js";
import {
  regenerateCompanyBrief,
  regenerateQuestionCategory,
  recomputeCoverageAndSchedule,
} from "../pipeline/regenerate.js";

export const kitsRouter = Router();
kitsRouter.use(requireAuth);

const createSchema = z.object({
  jobDescription: z.string().min(1),
  companyUrl: z.string().min(1),
  daysAvailable: z.number().int().min(1).max(60),
});

async function runGeneration(kitId: string) {
  const doc = await KitModel.findById(kitId);
  if (!doc) return;
  doc.status = "generating";
  await doc.save();

  try {
    const kit = await generateKit(
      {
        jobDescription: doc.jobDescription,
        companyUrl: doc.companyUrl,
        daysAvailable: doc.daysAvailable,
      },
      (event) => {
        KitModel.updateOne(
          { _id: kitId },
          { $push: { progress: { step: event.step, message: event.message, at: new Date() } } },
        ).catch(() => {});
      },
    );

    const itemState: Record<string, ItemSource> = {};
    for (const q of kit.questions) itemState[q.id] = "generated";
    for (const f of kit.flashcards) itemState[f.id] = "generated";

    doc.kit = kit;
    doc.itemState = itemState;
    doc.status = "ready";
    await doc.save();
  } catch (error) {
    doc.status = "failed";
    doc.error = {
      code: "GENERATION_FAILED",
      message: error instanceof Error ? error.message : String(error),
    };
    await doc.save();
  }
}

function readinessScoreFor(doc: InstanceType<typeof KitModel>): number | null {
  const kit = doc.kit as Kit | null;
  if (!kit || doc.status !== "ready") return null;
  return computeWeakSpots(kit.role.requirements, kit.questions, kit.flashcards, doc.practice).readinessScore;
}

function summarize(doc: InstanceType<typeof KitModel>) {
  const kit = doc.kit as Kit | null;
  return {
    id: doc.id,
    status: doc.status,
    company: kit?.source.company ?? "",
    role: kit?.source.role ?? "",
    daysAvailable: doc.daysAvailable,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    error: doc.error,
    readinessScore: readinessScoreFor(doc),
  };
}

kitsRouter.get("/", async (req, res) => {
  const docs = await KitModel.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ kits: docs.map(summarize) });
});

kitsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  }
  const { jobDescription, companyUrl, daysAvailable } = parsed.data;
  const dedupeKey = computeDedupeKey(req.userId!, jobDescription, companyUrl);

  const existing = await KitModel.findOne({ userId: req.userId, dedupeKey, status: { $ne: "failed" } });
  if (existing) {
    return res.status(200).json({ kit: summarize(existing), duplicate: true });
  }

  const doc = await KitModel.create({
    userId: req.userId,
    jobDescription,
    companyUrl,
    daysAvailable,
    dedupeKey,
    status: "pending",
  });

  runGeneration(doc.id).catch(() => {});
  res.status(202).json({ kit: summarize(doc) });
});

const batchSchema = z.object({
  cases: z
    .array(
      z.object({
        jobDescription: z.string().min(1),
        companyUrl: z.string().min(1),
        daysAvailable: z.number().int().min(1).max(60),
      }),
    )
    .min(1)
    .max(20),
});

kitsRouter.post("/batch", async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  }

  const created = [];
  for (const c of parsed.data.cases) {
    const dedupeKey = computeDedupeKey(req.userId!, c.jobDescription, c.companyUrl);
    const existing = await KitModel.findOne({ userId: req.userId, dedupeKey, status: { $ne: "failed" } });
    if (existing) {
      created.push(summarize(existing));
      continue;
    }
    const doc = await KitModel.create({
      userId: req.userId,
      jobDescription: c.jobDescription,
      companyUrl: c.companyUrl,
      daysAvailable: c.daysAvailable,
      dedupeKey,
      status: "pending",
    });
    runGeneration(doc.id).catch(() => {});
    created.push(summarize(doc));
  }

  res.status(202).json({ kits: created });
});

async function loadOwnedKit(req: any, res: any) {
  const doc = await KitModel.findOne({ _id: req.params.id, userId: req.userId });
  if (!doc) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return null;
  }
  return doc;
}

kitsRouter.get("/:id", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  res.json({
    id: doc.id,
    status: doc.status,
    progress: doc.progress,
    error: doc.error,
    kit: doc.kit,
    itemState: doc.itemState,
    practice: doc.practice,
    readinessScore: readinessScoreFor(doc),
    daysAvailable: doc.daysAvailable,
    companyUrl: doc.companyUrl,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
});

kitsRouter.delete("/:id", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  await doc.deleteOne();
  res.status(204).send();
});

function requireReadyKit(doc: any, res: any): Kit | null {
  if (doc.status !== "ready" || !doc.kit) {
    res.status(409).json({ error: { code: "KIT_NOT_READY", message: "Kit is not ready for editing yet" } });
    return null;
  }
  return doc.kit as Kit;
}

async function persistKit(doc: any, kit: Kit) {
  const validation = validateKit(kit);
  if (!validation.valid) {
    throw new Error(`Edit produced an invalid kit: ${validation.errors.join("; ")}`);
  }
  doc.kit = kit;
  doc.markModified("kit");
  await doc.save();
}

// --- Company brief ---
const briefEditSchema = z.object({ summary: z.string().optional(), what_they_do: z.string().optional() });
kitsRouter.patch("/:id/company-brief", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const parsed = briefEditSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid fields" } });

  kit.company_brief = { ...kit.company_brief, ...parsed.data };
  await persistKit(doc, kit);
  res.json({ kit: doc.kit });
});

kitsRouter.post("/:id/company-brief/regenerate", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;

  const fresh = await regenerateCompanyBrief(kit.source.company, doc.companyUrl);
  kit.source = { ...kit.source, company: fresh.companyName };
  kit.company_brief = { summary: fresh.summary, what_they_do: fresh.what_they_do, sources: fresh.sources };
  await persistKit(doc, kit);
  res.json({ kit: doc.kit });
});

// --- Questions ---
const questionEditSchema = z.object({
  prompt: z.string().optional(),
  answer_outline: z.string().optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]).optional(),
  requirement_ids: z.array(z.string()).optional(),
});

kitsRouter.patch("/:id/questions/:qid", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const parsed = questionEditSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid fields" } });

  const idx = kit.questions.findIndex((q) => q.id === req.params.qid);
  if (idx === -1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Question not found" } });

  kit.questions[idx] = { ...kit.questions[idx], ...parsed.data };
  const recomputed = recomputeCoverageAndSchedule(kit);
  doc.itemState = { ...doc.itemState, [req.params.qid]: "edited" };
  doc.markModified("itemState");
  await persistKit(doc, recomputed);
  res.json({ kit: doc.kit });
});

const manualQuestionSchema = z.object({
  prompt: z.string().min(1),
  answer_outline: z.string().default(""),
  difficulty: z.number().int().min(1).max(3).default(2),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  requirement_ids: z.array(z.string()).default([]),
});

kitsRouter.post("/:id/questions", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const parsed = manualQuestionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid fields" } });

  const maxN = kit.questions.reduce((m, q) => Math.max(m, Number(q.id.replace(/^q/, "")) || 0), 0);
  const newQuestion: Question = { id: `q${maxN + 1}`, ...parsed.data };
  kit.questions.push(newQuestion);
  const recomputed = recomputeCoverageAndSchedule(kit);
  doc.itemState = { ...doc.itemState, [newQuestion.id]: "manual" };
  doc.markModified("itemState");
  await persistKit(doc, recomputed);
  res.status(201).json({ kit: doc.kit });
});

kitsRouter.delete("/:id/questions/:qid", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;

  kit.questions = kit.questions.filter((q) => q.id !== req.params.qid);
  const recomputed = recomputeCoverageAndSchedule(kit);
  const nextState = { ...doc.itemState };
  delete nextState[req.params.qid];
  doc.itemState = nextState;
  doc.markModified("itemState");
  await persistKit(doc, recomputed);
  res.json({ kit: doc.kit });
});

const reorderSchema = z.object({
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  orderedIds: z.array(z.string()),
});

kitsRouter.post("/:id/questions/reorder", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid fields" } });

  const { category, orderedIds } = parsed.data;
  const inCategory = kit.questions.filter((q) => q.category === category);
  const outsideCategory = kit.questions.filter((q) => q.category !== category);
  const byId = new Map(inCategory.map((q) => [q.id, q]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Question[];
  const missing = inCategory.filter((q) => !orderedIds.includes(q.id));

  kit.questions = [...outsideCategory, ...reordered, ...missing];
  await persistKit(doc, kit);
  res.json({ kit: doc.kit });
});

kitsRouter.post("/:id/questions/:qid/move-category", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const target = z.enum(["technical", "behavioural", "system-design", "company-fit"]).safeParse(req.body.category);
  if (!target.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid category" } });

  const idx = kit.questions.findIndex((q) => q.id === req.params.qid);
  if (idx === -1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Question not found" } });
  kit.questions[idx] = { ...kit.questions[idx], category: target.data };
  doc.itemState = { ...doc.itemState, [req.params.qid]: "edited" };
  doc.markModified("itemState");
  await persistKit(doc, kit);
  res.json({ kit: doc.kit });
});

kitsRouter.post("/:id/questions/regenerate", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const category = z
    .enum(["technical", "behavioural", "system-design", "company-fit"])
    .safeParse(req.body.category);
  if (!category.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid category" } });

  const result = await regenerateQuestionCategory(kit, doc.itemState, category.data, kit.company_brief.what_they_do);
  kit.questions = result.questions;
  doc.itemState = result.itemState;
  doc.markModified("itemState");
  const recomputed = recomputeCoverageAndSchedule(kit);
  recomputed.coverage.passes = kit.coverage.passes + 1;
  await persistKit(doc, recomputed);
  res.json({ kit: doc.kit });
});

// --- Flashcards ---
const flashcardEditSchema = z.object({
  front: z.string().optional(),
  back: z.string().optional(),
  requirement_ids: z.array(z.string()).optional(),
});

kitsRouter.patch("/:id/flashcards/:fid", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const parsed = flashcardEditSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid fields" } });

  const idx = kit.flashcards.findIndex((f) => f.id === req.params.fid);
  if (idx === -1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Flashcard not found" } });
  kit.flashcards[idx] = { ...kit.flashcards[idx], ...parsed.data };
  doc.itemState = { ...doc.itemState, [req.params.fid]: "edited" };
  doc.markModified("itemState");
  await persistKit(doc, kit);
  res.json({ kit: doc.kit });
});

const manualFlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()).default([]),
});

kitsRouter.post("/:id/flashcards", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const parsed = manualFlashcardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid fields" } });

  const maxN = kit.flashcards.reduce((m, f) => Math.max(m, Number(f.id.replace(/^f/, "")) || 0), 0);
  const newCard = { id: `f${maxN + 1}`, ...parsed.data };
  kit.flashcards.push(newCard);
  doc.itemState = { ...doc.itemState, [newCard.id]: "manual" };
  doc.markModified("itemState");
  await persistKit(doc, kit);
  res.status(201).json({ kit: doc.kit });
});

kitsRouter.delete("/:id/flashcards/:fid", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  kit.flashcards = kit.flashcards.filter((f) => f.id !== req.params.fid);
  const nextState = { ...doc.itemState };
  delete nextState[req.params.fid];
  doc.itemState = nextState;
  doc.markModified("itemState");
  await persistKit(doc, kit);
  res.json({ kit: doc.kit });
});

// --- Schedule ---
kitsRouter.post("/:id/schedule/regenerate", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;
  const recomputed = recomputeCoverageAndSchedule(kit);
  await persistKit(doc, recomputed);
  res.json({ kit: doc.kit });
});

// --- Practice mode ---
const practiceSchema = z.object({ cardId: z.string(), confidence: z.number().int().min(1).max(5) });
kitsRouter.post("/:id/practice", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const parsed = practiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid fields" } });

  doc.practice.push({ cardId: parsed.data.cardId, confidence: parsed.data.confidence, reviewedAt: new Date() });
  await doc.save();
  res.status(201).json({ practice: doc.practice });
});

kitsRouter.get("/:id/practice/next", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;

  const lastConfidenceByCard = new Map<string, number>();
  for (const entry of doc.practice) {
    lastConfidenceByCard.set(entry.cardId, entry.confidence);
  }

  const ranked = [...kit.flashcards].sort((a, b) => {
    const ca = lastConfidenceByCard.get(a.id) ?? 0; // unreviewed cards sort first
    const cb = lastConfidenceByCard.get(b.id) ?? 0;
    return ca - cb;
  });

  res.json({
    order: ranked.map((c) => c.id),
    covered: [...lastConfidenceByCard.keys()],
    uncovered: kit.flashcards.filter((c) => !lastConfidenceByCard.has(c.id)).map((c) => c.id),
  });
});

// --- Weak spots report (custom feature) ---
kitsRouter.get("/:id/weak-spots", async (req, res) => {
  const doc = await loadOwnedKit(req, res);
  if (!doc) return;
  const kit = requireReadyKit(doc, res);
  if (!kit) return;

  const report = computeWeakSpots(kit.role.requirements, kit.questions, kit.flashcards, doc.practice);
  res.json(report);
});
