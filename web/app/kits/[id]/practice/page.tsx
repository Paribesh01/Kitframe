"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import type { Kit, KitDetail } from "@/lib/types";

interface NextOrder {
  order: string[];
  covered: string[];
  uncovered: string[];
}

const CONFIDENCE_LABELS = ["Blank", "Shaky", "OK", "Good", "Nailed it"];

function PracticeContent() {
  const params = useParams<{ id: string }>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [order, setOrder] = useState<NextOrder | null>(null);
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detail, next] = await Promise.all([
        api.get<KitDetail>(`/api/kits/${params.id}`),
        api.get<NextOrder>(`/api/kits/${params.id}/practice/next`),
      ]);
      if (!detail.kit) {
        setLoadError("This kit isn't ready yet.");
        return;
      }
      setKit(detail.kit);
      setOrder(next);
      setCursor(0);
      setRevealed(false);
    } catch {
      setLoadError("Could not load practice mode for this kit.");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;
  if (!kit || !order) return <p className="text-sm text-slate-500">Loading…</p>;

  if (kit.flashcards.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500">
        This kit has no flashcards yet. Add some from the builder first.
      </div>
    );
  }

  const currentId = order.order[cursor];
  const card = kit.flashcards.find((c) => c.id === currentId);

  async function recordConfidence(confidence: number) {
    await api.post(`/api/kits/${params.id}/practice`, { cardId: currentId, confidence });
    if (cursor + 1 < order!.order.length) {
      setCursor((c) => c + 1);
      setRevealed(false);
    } else {
      await load();
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Card {cursor + 1} of {order.order.length}
        </span>
        <span>
          {order.covered.length} reviewed · {order.uncovered.length} not yet seen
        </span>
      </div>

      {card ? (
        <div className="card p-8 text-center">
          <p className="mb-6 text-lg font-medium text-slate-900">{card.front}</p>
          {revealed ? (
            <>
              <p className="mb-6 text-sm text-slate-600">{card.back}</p>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">How confident were you?</p>
              <div className="flex justify-center gap-2">
                {CONFIDENCE_LABELS.map((label, i) => (
                  <button key={label} className="btn-secondary" onClick={() => recordConfidence(i + 1)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setRevealed(true)}>
              Reveal answer
            </button>
          )}
        </div>
      ) : (
        <div className="card p-6 text-center text-sm text-slate-500">All caught up — nice work.</div>
      )}
    </div>
  );
}

export default function PracticePage() {
  const params = useParams<{ id: string }>();
  return (
    <AuthGuard>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href={`/kits/${params.id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
          &larr; Back to kit
        </Link>
        <PracticeContent />
      </main>
    </AuthGuard>
  );
}
