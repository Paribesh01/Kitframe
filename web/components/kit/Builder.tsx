"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  GraduationCap,
  Layers,
  ListChecks,
  MessageSquareText,
  Printer,
  Target,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { KitDetail } from "@/lib/types";
import { BriefTab } from "./BriefTab";
import { RequirementsTab } from "./RequirementsTab";
import { QuestionsTab } from "./QuestionsTab";
import { FlashcardsTab } from "./FlashcardsTab";
import { ScheduleTab } from "./ScheduleTab";
import { WeakSpotsTab } from "./WeakSpotsTab";

type Tab = "brief" | "weak-spots" | "requirements" | "questions" | "flashcards" | "schedule";

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "brief", label: "Company brief", icon: Building2 },
  { id: "weak-spots", label: "Weak spots", icon: Target },
  { id: "requirements", label: "Role & requirements", icon: ListChecks },
  { id: "questions", label: "Questions", icon: MessageSquareText },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
];

export function Builder({
  kitId,
  initialDetail,
  onRefresh,
}: {
  kitId: string;
  initialDetail: KitDetail;
  onRefresh: () => void;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [tab, setTab] = useState<Tab>("brief");
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const kit = detail.kit!;
  const uncoveredMustHaves = kit.coverage.uncovered_requirement_ids.filter(
    (id) => kit.role.requirements.find((r) => r.id === id)?.priority === "must",
  );

  async function applyMutation<T extends { kit: unknown }>(fn: () => Promise<T>, successMessage = "Saved") {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fn();
      setDetail((prev) => ({ ...prev, kit: res.kit as KitDetail["kit"] }));
      toast.success(successMessage);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong";
      setBanner(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshItemState() {
    const res = await api.get<KitDetail>(`/api/kits/${kitId}`);
    setDetail(res);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{kit.role.title || "Untitled role"}</h1>
            {detail.readinessScore !== null && (
              <button
                type="button"
                onClick={() => setTab("weak-spots")}
                className={`badge transition-opacity hover:opacity-80 ${
                  detail.readinessScore >= 75
                    ? "bg-emerald-100 text-emerald-700"
                    : detail.readinessScore >= 45
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {detail.readinessScore}% ready
              </button>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-500">{kit.source.company}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/kits/${kitId}/print`} className="btn-secondary">
            <Printer className="h-4 w-4" />
            Print
          </Link>
          <Link href={`/kits/${kitId}/practice`} className="btn-primary">
            <GraduationCap className="h-4 w-4" />
            Practice flashcards
          </Link>
        </div>
      </div>

      {uncoveredMustHaves.length > 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {uncoveredMustHaves.length} must-have requirement(s) still have no question. Regenerate the
            relevant question category to close the gap.
          </span>
        </div>
      )}

      {banner && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {banner}
        </div>
      )}

      <div
        className="mb-6 flex flex-wrap gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1"
        role="tablist"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-white text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "brief" && (
        <BriefTab kitId={kitId} kit={kit} busy={busy} onMutate={applyMutation} />
      )}
      {tab === "weak-spots" && <WeakSpotsTab kitId={kitId} />}
      {tab === "requirements" && <RequirementsTab kit={kit} />}
      {tab === "questions" && (
        <QuestionsTab
          kitId={kitId}
          kit={kit}
          itemState={detail.itemState}
          busy={busy}
          onMutate={applyMutation}
          onRefreshState={refreshItemState}
        />
      )}
      {tab === "flashcards" && (
        <FlashcardsTab
          kitId={kitId}
          kit={kit}
          itemState={detail.itemState}
          busy={busy}
          onMutate={applyMutation}
        />
      )}
      {tab === "schedule" && <ScheduleTab kitId={kitId} kit={kit} busy={busy} onMutate={applyMutation} />}
    </div>
  );
}
