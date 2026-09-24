"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import type { Flashcard, ItemSource, Kit } from "@/lib/types";

interface Props {
  kitId: string;
  kit: Kit;
  itemState: Record<string, ItemSource>;
  busy: boolean;
  onMutate: (fn: () => Promise<{ kit: Kit }>, successMessage?: string) => Promise<void>;
}

const SOURCE_STYLES: Record<ItemSource, string> = {
  generated: "bg-ink-100 text-ink-500",
  edited: "bg-blue-100 text-blue-700",
  manual: "bg-purple-100 text-purple-700",
};

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

function FlashcardCard({
  kitId,
  card,
  index,
  source,
  busy,
  onMutate,
}: {
  kitId: string;
  card: Flashcard;
  index: number;
  source: ItemSource;
  busy: boolean;
  onMutate: Props["onMutate"];
}) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  return (
    <li className="rounded-xl border border-ink-200 p-3.5 transition-shadow hover:shadow-soft">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-500">
            {index + 1}
          </span>
          <span className={`badge ${SOURCE_STYLES[source]}`}>{source}</span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton icon={Pencil} label="Edit" disabled={busy} onClick={() => setEditing(true)} />
          <IconButton
            icon={Trash2}
            label="Delete"
            danger
            disabled={busy}
            onClick={() =>
              onMutate(() => api.delete<{ kit: Kit }>(`/api/kits/${kitId}/flashcards/${card.id}`), "Flashcard deleted")
            }
          />
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <input className="input" value={front} onChange={(e) => setFront(e.target.value)} />
          <textarea className="input" value={back} onChange={(e) => setBack(e.target.value)} />
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                onMutate(
                  () => api.patch<{ kit: Kit }>(`/api/kits/${kitId}/flashcards/${card.id}`, { front, back }),
                  "Flashcard saved",
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
          <p className="text-sm font-medium leading-snug text-ink-800">{card.front}</p>
          <div className="mt-2 rounded-lg bg-ink-50 px-2.5 py-2 text-sm leading-snug text-ink-600">{card.back}</div>
        </div>
      )}
    </li>
  );
}

export function FlashcardsTab({ kitId, kit, itemState, busy, onMutate }: Props) {
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  return (
    <div className="card p-5">
      {kit.flashcards.length === 0 ? (
        <p className="text-sm text-ink-400">No flashcards yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {kit.flashcards.map((c, i) => (
            <FlashcardCard
              key={c.id}
              kitId={kitId}
              card={c}
              index={i}
              source={itemState[c.id] ?? "generated"}
              busy={busy}
              onMutate={onMutate}
            />
          ))}
        </ul>
      )}

      {open ? (
        <div className="mt-4 space-y-2 rounded-xl border border-dashed border-ink-300 p-3">
          <input className="input" placeholder="Front" value={front} onChange={(e) => setFront(e.target.value)} />
          <textarea className="input" placeholder="Back" value={back} onChange={(e) => setBack(e.target.value)} />
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={busy || !front.trim() || !back.trim()}
              onClick={() =>
                onMutate(
                  () => api.post<{ kit: Kit }>(`/api/kits/${kitId}/flashcards`, { front, back, requirement_ids: [] }),
                  "Flashcard added",
                ).then(() => {
                  setFront("");
                  setBack("");
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
      ) : (
        <button className="btn-ghost mt-4 px-2.5 text-brand-600 hover:bg-brand-50" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add flashcard
        </button>
      )}
    </div>
  );
}
