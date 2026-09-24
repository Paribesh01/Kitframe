"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CircleDashed, CircleSlash, GraduationCap, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { WeakSpotItem, WeakSpotsReport, WeakSpotStatus } from "@/lib/types";

const STATUS_META: Record<
  WeakSpotStatus,
  { label: string; className: string; icon: typeof CircleDashed }
> = {
  uncovered: { label: "No question yet", className: "bg-red-100 text-red-700", icon: CircleSlash },
  unreviewed: { label: "Not yet practised", className: "bg-ink-100 text-ink-600", icon: CircleDashed },
  "needs-work": { label: "Needs work", className: "bg-amber-100 text-amber-700", icon: AlertCircle },
  solid: { label: "Solid", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

function ReadinessRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 75 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#eeeef4" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-ink-900">{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400">ready</span>
      </div>
    </div>
  );
}

function WeakSpotRow({ item, kitId }: { item: WeakSpotItem; kitId: string }) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;
  return (
    <li className="flex items-start justify-between gap-4 rounded-xl border border-ink-100 p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.className}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink-900">{item.text}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`badge ${item.priority === "must" ? "bg-red-50 text-red-600" : "bg-ink-100 text-ink-500"}`}>
              {item.priority}
            </span>
            <span className="badge bg-ink-100 text-ink-500">{meta.label}</span>
            {item.latestConfidence !== null && (
              <span className="text-xs text-ink-400">confidence {item.latestConfidence.toFixed(1)}/5</span>
            )}
          </div>
        </div>
      </div>
      {item.status !== "uncovered" && item.flashcardIds.length > 0 && (
        <Link href={`/kits/${kitId}/practice`} className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs">
          Practise
        </Link>
      )}
    </li>
  );
}

export function WeakSpotsTab({ kitId }: { kitId: string }) {
  const [report, setReport] = useState<WeakSpotsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<WeakSpotsReport>(`/api/kits/${kitId}/weak-spots`)
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the report"));
  }, [kitId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!report)
    return (
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Scoring your readiness…
      </div>
    );

  const uncovered = report.items.filter((i) => i.status === "uncovered");
  const needsWork = report.items.filter((i) => i.status === "needs-work" || i.status === "unreviewed");

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center gap-6 p-6">
        <ReadinessRing score={report.readinessScore} />
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Interview readiness</h2>
          <p className="mt-1 max-w-md text-sm text-ink-500">
            Combines requirement coverage with your practice confidence, weighted toward must-have
            requirements — so a shaky must-have always outranks a shaky nice-to-have.
          </p>
          {(uncovered.length > 0 || needsWork.length > 0) && (
            <p className="mt-3 text-sm text-ink-600">
              {uncovered.length > 0 && (
                <>
                  <strong className="text-red-600">{uncovered.length}</strong> uncovered
                  {needsWork.length > 0 && " · "}
                </>
              )}
              {needsWork.length > 0 && (
                <>
                  <strong className="text-amber-600">{needsWork.length}</strong> need more practice
                </>
              )}
            </p>
          )}
        </div>
        <Link href={`/kits/${kitId}/practice`} className="btn-primary ml-auto">
          <GraduationCap className="h-4 w-4" />
          Practise now
        </Link>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-medium text-ink-900">Requirements, ranked by what needs attention</h3>
        {report.items.length === 0 ? (
          <p className="text-sm text-ink-400">No requirements to score yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {report.items.map((item) => (
              <WeakSpotRow key={item.requirementId} item={item} kitId={kitId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
