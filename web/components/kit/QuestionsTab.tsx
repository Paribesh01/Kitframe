"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ItemSource, Kit, Question, QuestionCategory } from "@/lib/types";

const CATEGORIES: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];
const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System design",
  "company-fit": "Company fit",
};
const CATEGORY_ACCENT: Record<QuestionCategory, string> = {
  technical: "border-l-blue-400",
  behavioural: "border-l-purple-400",
  "system-design": "border-l-indigo-400",
  "company-fit": "border-l-amber-400",
};

const SOURCE_STYLES: Record<ItemSource, string> = {
  generated: "bg-ink-100 text-ink-500",
  edited: "bg-blue-100 text-blue-700",
  manual: "bg-purple-100 text-purple-700",
};

interface Props {
  kitId: string;
  kit: Kit;
  itemState: Record<string, ItemSource>;
  busy: boolean;
  onMutate: (fn: () => Promise<{ kit: Kit }>, successMessage?: string) => Promise<void>;
  onRefreshState: () => Promise<void>;
}

function DifficultyDots({ difficulty }: { difficulty: number }) {
  return (
    <span className="flex items-center gap-0.5" title={`Difficulty ${difficulty}/3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1.5 w-1.5 rounded-full ${n <= difficulty ? "bg-brand-500" : "bg-ink-200"}`}
        />
      ))}
    </span>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
        danger
          ? "border-red-200 text-red-500 hover:bg-red-50"
          : "border-ink-200 text-ink-500 hover:border-brand-300 hover:text-brand-700"
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function QuestionCard({
  kitId,
  question,
  index,
  source,
  busy,
  requirementText,
  onMutate,
  onMove,
  isFirst,
  isLast,
}: {
  kitId: string;
  question: Question;
  index: number;
  source: ItemSource;
  busy: boolean;
  requirementText: string;
  onMutate: Props["onMutate"];
  onMove: (direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [outline, setOutline] = useState(question.answer_outline);

  return (
    <li className="rounded-xl border border-ink-200 p-3.5 transition-shadow hover:shadow-soft">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-500">
            {index + 1}
          </span>
          <span className={`badge ${SOURCE_STYLES[source]}`}>{source}</span>
          <DifficultyDots difficulty={question.difficulty} />
        </div>
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronUp} label="Move up" disabled={isFirst || busy} onClick={() => onMove("up")} />
          <IconButton
            icon={ChevronDown}
            label="Move down"
            disabled={isLast || busy}
            onClick={() => onMove("down")}
          />
          <select
            aria-label="Move to category"
            className="h-8 rounded-lg border border-ink-200 bg-white px-1.5 text-xs text-ink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            value={question.category}
            disabled={busy}
            onChange={(e) =>
              onMutate(
                () =>
                  api.post<{ kit: Kit }>(`/api/kits/${kitId}/questions/${question.id}/move-category`, {
                    category: e.target.value,
                  }),
                "Moved to " + CATEGORY_LABELS[e.target.value as QuestionCategory],
              )
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <IconButton icon={Pencil} label="Edit" disabled={busy} onClick={() => setEditing(true)} />
          <IconButton
            icon={Trash2}
            label="Delete"
            danger
            disabled={busy}
            onClick={() =>
              onMutate(() => api.delete<{ kit: Kit }>(`/api/kits/${kitId}/questions/${question.id}`), "Question deleted")
            }
          />
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea className="input" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <textarea className="input" value={outline} onChange={(e) => setOutline(e.target.value)} />
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                onMutate(
                  () =>
                    api.patch<{ kit: Kit }>(`/api/kits/${kitId}/questions/${question.id}`, {
                      prompt,
                      answer_outline: outline,
                    }),
                  "Question saved",
                ).then(() => setEditing(false))
              }
            >
              Save
            </button>
            <button className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium leading-snug text-ink-800">{question.prompt}</p>
          {question.answer_outline && (
            <p className="mt-1.5 text-sm leading-snug text-ink-500">{question.answer_outline}</p>
          )}
          <p className="mt-2 text-xs text-ink-400">Tests: {requirementText || "general fit"}</p>
        </div>
      )}
    </li>
  );
}

export function QuestionsTab({ kitId, kit, itemState, busy, onMutate, onRefreshState }: Props) {
  async function reorder(category: QuestionCategory, orderedIds: string[]) {
    await onMutate(
      () => api.post<{ kit: Kit }>(`/api/kits/${kitId}/questions/reorder`, { category, orderedIds }),
      "Reordered",
    );
  }

  return (
    <div className="space-y-4">
      {CATEGORIES.map((category) => {
        const questions = kit.questions.filter((q) => q.category === category);
        const isEmpty = questions.length === 0;
        return (
          <div
            key={category}
            className={`card border-l-4 p-5 ${CATEGORY_ACCENT[category]} ${isEmpty ? "opacity-70" : ""}`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium text-ink-900">
                {CATEGORY_LABELS[category]}{" "}
                <span className="font-normal text-ink-400">({questions.length})</span>
              </h3>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() =>
                  onMutate(
                    () => api.post<{ kit: Kit }>(`/api/kits/${kitId}/questions/regenerate`, { category }),
                    `Regenerated ${CATEGORY_LABELS[category].toLowerCase()}`,
                  ).then(onRefreshState)
                }
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
            </div>

            {isEmpty ? (
              <p className="text-sm text-ink-400">No questions in this category yet.</p>
            ) : (
              <ul className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    kitId={kitId}
                    question={q}
                    index={i}
                    source={itemState[q.id] ?? "generated"}
                    busy={busy}
                    requirementText={
                      kit.role.requirements.find((r) => r.id === q.requirement_ids[0])?.text ?? ""
                    }
                    onMutate={onMutate}
                    isFirst={i === 0}
                    isLast={i === questions.length - 1}
                    onMove={(direction) => {
                      const ids = questions.map((qq) => qq.id);
                      const idx = ids.indexOf(q.id);
                      const swapWith = direction === "up" ? idx - 1 : idx + 1;
                      if (swapWith < 0 || swapWith >= ids.length) return;
                      [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
                      reorder(category, ids);
                    }}
                  />
                ))}
              </ul>
            )}

            <AddQuestionForm kitId={kitId} category={category} busy={busy} onMutate={onMutate} />
          </div>
        );
      })}
    </div>
  );
}

function AddQuestionForm({
  kitId,
  category,
  busy,
  onMutate,
}: {
  kitId: string;
  category: QuestionCategory;
  busy: boolean;
  onMutate: Props["onMutate"];
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [outline, setOutline] = useState("");

  if (!open) {
    return (
      <button className="btn-ghost mt-3 px-2.5 text-brand-600 hover:bg-brand-50" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add question
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-dashed border-ink-300 p-3">
      <textarea
        className="input"
        placeholder="Question prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <textarea
        className="input"
        placeholder="Answer outline"
        value={outline}
        onChange={(e) => setOutline(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={busy || !prompt.trim()}
          onClick={() =>
            onMutate(
              () =>
                api.post<{ kit: Kit }>(`/api/kits/${kitId}/questions`, {
                  prompt,
                  answer_outline: outline,
                  category,
                  difficulty: 2,
                  requirement_ids: [],
                }),
              "Question added",
            ).then(() => {
              setPrompt("");
              setOutline("");
              setOpen(false);
            })
          }
        >
          Add
        </button>
        <button className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
