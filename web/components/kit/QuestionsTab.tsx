"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { ItemSource, Kit, Question, QuestionCategory } from "@/lib/types";

const CATEGORIES: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];
const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System design",
  "company-fit": "Company fit",
};

const SOURCE_STYLES: Record<ItemSource, string> = {
  generated: "bg-slate-100 text-slate-500",
  edited: "bg-blue-100 text-blue-700",
  manual: "bg-purple-100 text-purple-700",
};

interface Props {
  kitId: string;
  kit: Kit;
  itemState: Record<string, ItemSource>;
  busy: boolean;
  onMutate: (fn: () => Promise<{ kit: Kit }>) => Promise<void>;
  onRefreshState: () => Promise<void>;
}

function QuestionCard({
  kitId,
  question,
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
    <li className="rounded-md border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`badge ${SOURCE_STYLES[source]}`}>{source}</span>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Move up"
            className="btn-secondary px-2 py-1"
            disabled={isFirst || busy}
            onClick={() => onMove("up")}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move down"
            className="btn-secondary px-2 py-1"
            disabled={isLast || busy}
            onClick={() => onMove("down")}
          >
            ↓
          </button>
          <select
            aria-label="Move to category"
            className="input px-2 py-1 text-xs"
            value={question.category}
            disabled={busy}
            onChange={(e) =>
              onMutate(() =>
                api.post<{ kit: Kit }>(`/api/kits/${kitId}/questions/${question.id}/move-category`, {
                  category: e.target.value,
                }),
              )
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-danger px-2 py-1"
            disabled={busy}
            onClick={() => onMutate(() => api.delete<{ kit: Kit }>(`/api/kits/${kitId}/questions/${question.id}`))}
          >
            Delete
          </button>
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
                onMutate(() =>
                  api.patch<{ kit: Kit }>(`/api/kits/${kitId}/questions/${question.id}`, {
                    prompt,
                    answer_outline: outline,
                  }),
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
          <p className="text-sm font-medium text-slate-800">{question.prompt}</p>
          <p className="mt-1 text-sm text-slate-500">{question.answer_outline}</p>
          <p className="mt-2 text-xs text-slate-400">Tests: {requirementText || "general fit"}</p>
          <button className="btn-secondary mt-2" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      )}
    </li>
  );
}

export function QuestionsTab({ kitId, kit, itemState, busy, onMutate, onRefreshState }: Props) {
  async function reorder(category: QuestionCategory, orderedIds: string[]) {
    await onMutate(() =>
      api.post<{ kit: Kit }>(`/api/kits/${kitId}/questions/reorder`, { category, orderedIds }),
    );
  }

  return (
    <div className="space-y-6">
      {CATEGORIES.map((category) => {
        const questions = kit.questions.filter((q) => q.category === category);
        return (
          <div key={category} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-slate-900">
                {CATEGORY_LABELS[category]} ({questions.length})
              </h3>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() =>
                  onMutate(() =>
                    api.post<{ kit: Kit }>(`/api/kits/${kitId}/questions/regenerate`, { category }),
                  ).then(onRefreshState)
                }
              >
                Regenerate {CATEGORY_LABELS[category].toLowerCase()}
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="text-sm text-slate-400">No questions in this category yet.</p>
            ) : (
              <ul className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    kitId={kitId}
                    question={q}
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
      <button className="btn-secondary mt-3" onClick={() => setOpen(true)}>
        + Add question
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-dashed border-slate-300 p-3">
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
            onMutate(() =>
              api.post<{ kit: Kit }>(`/api/kits/${kitId}/questions`, {
                prompt,
                answer_outline: outline,
                category,
                difficulty: 2,
                requirement_ids: [],
              }),
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
