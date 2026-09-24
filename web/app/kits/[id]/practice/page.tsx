"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Loader2, PartyPopper } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import type { Kit, KitDetail } from "@/lib/types";

interface NextOrder {
  order: string[];
  covered: string[];
  uncovered: string[];
}

const CONFIDENCE_OPTIONS = [
  { label: "Blank", className: "border-red-200 text-red-700 hover:bg-red-50" },
  { label: "Shaky", className: "border-orange-200 text-orange-700 hover:bg-orange-50" },
  { label: "OK", className: "border-amber-200 text-amber-700 hover:bg-amber-50" },
  { label: "Good", className: "border-lime-200 text-lime-700 hover:bg-lime-50" },
  { label: "Nailed it", className: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
];

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
  if (!kit || !order)
    return (
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );

  if (kit.flashcards.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-ink-500">
        This kit has no flashcards yet. Add some from the builder first.
      </div>
    );
  }

  const currentId = order.order[cursor];
  const card = kit.flashcards.find((c) => c.id === currentId);
  const progressPct = Math.round((cursor / order.order.length) * 100);

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
      <div className="mb-2 flex items-center justify-between text-sm text-ink-500">
        <span className="font-medium text-ink-700">
          Card {Math.min(cursor + 1, order.order.length)} of {order.order.length}
        </span>
        <span>
          {order.covered.length} reviewed · {order.uncovered.length} not yet seen
        </span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {card ? (
        <div className="card p-10 text-center">
          <p className="mb-8 text-xl font-semibold leading-snug text-ink-900">{card.front}</p>
          {revealed ? (
            <>
              <div className="mb-8 rounded-xl bg-brand-50/60 px-5 py-4 text-left text-sm leading-relaxed text-ink-700">
                {card.back}
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                How confident were you?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {CONFIDENCE_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    className={`rounded-xl border bg-white px-3.5 py-2 text-sm font-medium transition-colors ${opt.className}`}
                    onClick={() => recordConfidence(i + 1)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="btn-primary mx-auto" onClick={() => setRevealed(true)}>
              <Eye className="h-4 w-4" />
              Reveal answer
            </button>
          )}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <PartyPopper className="h-6 w-6" />
          </span>
          <p className="font-medium text-ink-900">All caught up — nice work.</p>
        </div>
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
        <Link
          href={`/kits/${params.id}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to kit
        </Link>
        <PracticeContent />
      </main>
    </AuthGuard>
  );
}
