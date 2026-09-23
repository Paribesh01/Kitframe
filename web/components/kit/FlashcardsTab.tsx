"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Flashcard, ItemSource, Kit } from "@/lib/types";

interface Props {
  kitId: string;
  kit: Kit;
  itemState: Record<string, ItemSource>;
  busy: boolean;
  onMutate: (fn: () => Promise<{ kit: Kit }>) => Promise<void>;
}

const SOURCE_STYLES: Record<ItemSource, string> = {
  generated: "bg-slate-100 text-slate-500",
  edited: "bg-blue-100 text-blue-700",
  manual: "bg-purple-100 text-purple-700",
};

function FlashcardCard({ kitId, card, source, busy, onMutate }: {
  kitId: string;
  card: Flashcard;
  source: ItemSource;
  busy: boolean;
  onMutate: Props["onMutate"];
}) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  return (
    <li className="rounded-md border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className={`badge ${SOURCE_STYLES[source]}`}>{source}</span>
        <button
          className="btn-danger px-2 py-1"
          disabled={busy}
          onClick={() => onMutate(() => api.delete<{ kit: Kit }>(`/api/kits/${kitId}/flashcards/${card.id}`))}
        >
          Delete
        </button>
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
                onMutate(() => api.patch<{ kit: Kit }>(`/api/kits/${kitId}/flashcards/${card.id}`, { front, back })).then(
                  () => setEditing(false),
                )
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
          <p className="text-sm font-medium text-slate-800">{card.front}</p>
          <p className="mt-1 text-sm text-slate-500">{card.back}</p>
          <button className="btn-secondary mt-2" onClick={() => setEditing(true)}>
            Edit
          </button>
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
        <p className="text-sm text-slate-400">No flashcards yet.</p>
      ) : (
        <ul className="space-y-3">
          {kit.flashcards.map((c) => (
            <FlashcardCard
              key={c.id}
              kitId={kitId}
              card={c}
              source={itemState[c.id] ?? "generated"}
              busy={busy}
              onMutate={onMutate}
            />
          ))}
        </ul>
      )}

      {open ? (
        <div className="mt-4 space-y-2 rounded-md border border-dashed border-slate-300 p-3">
          <input className="input" placeholder="Front" value={front} onChange={(e) => setFront(e.target.value)} />
          <textarea className="input" placeholder="Back" value={back} onChange={(e) => setBack(e.target.value)} />
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={busy || !front.trim() || !back.trim()}
              onClick={() =>
                onMutate(() =>
                  api.post<{ kit: Kit }>(`/api/kits/${kitId}/flashcards`, { front, back, requirement_ids: [] }),
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
        <button className="btn-secondary mt-4" onClick={() => setOpen(true)}>
          + Add flashcard
        </button>
      )}
    </div>
  );
}
