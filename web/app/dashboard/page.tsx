"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FolderKanban, Gauge, Loader2, XCircle } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { NavBar } from "@/components/NavBar";
import { NewKitForm } from "@/components/NewKitForm";
import { KitCardSkeleton } from "@/components/Skeleton";
import { api } from "@/lib/api";
import type { KitSummary } from "@/lib/types";

const STATUS_META: Record<KitSummary["status"], { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Queued", className: "bg-ink-100 text-ink-600", icon: Clock },
  generating: { label: "Generating", className: "bg-amber-100 text-amber-700", icon: Loader2 },
  ready: { label: "Ready", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-red-100 text-red-700", icon: XCircle },
};

function StatusBadge({ status }: { status: KitSummary["status"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`badge ${meta.className}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "generating" ? "animate-spin" : ""}`} />
      {meta.label}
    </span>
  );
}

function readinessClass(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-700";
  if (score >= 45) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function ReadinessPill({ score }: { score: number }) {
  return <span className={`badge ${readinessClass(score)}`}>{score}% ready</span>;
}

function StatTile({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Gauge }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-bold leading-none text-ink-900">{value}</p>
        <p className="mt-1 text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}

function DashboardStats({ kits }: { kits: KitSummary[] }) {
  const ready = kits.filter((k) => k.status === "ready");
  const scores = ready.map((k) => k.readinessScore).filter((s): s is number => s !== null);
  const avgReadiness = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const inProgress = kits.filter((k) => k.status === "pending" || k.status === "generating").length;

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Total kits" value={kits.length} icon={FolderKanban} />
      <StatTile label="Ready" value={ready.length} icon={CheckCircle2} />
      <StatTile label="In progress" value={inProgress} icon={Loader2} />
      <StatTile label="Avg. readiness" value={avgReadiness !== null ? `${avgReadiness}%` : "—"} icon={Gauge} />
    </div>
  );
}

function DashboardContent() {
  const [kits, setKits] = useState<KitSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ kits: KitSummary[] }>("/api/kits");
      setKits(res.kits);
      setLoadError(null);
    } catch {
      setLoadError("Could not load your kits. Try refreshing.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasActive = kits?.some((k) => k.status === "pending" || k.status === "generating");
    if (!hasActive) return;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [kits, load]);

  return (
    <AuthGuard>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Your prep kits</h1>
          <p className="mt-1 text-sm text-ink-500">Paste a role below, or upload several at once.</p>
        </div>

        {kits && kits.length > 0 && <DashboardStats kits={kits} />}

        <div className="mb-10">
          <NewKitForm onCreated={load} />
        </div>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}

        {kits === null && !loadError && (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Loading kits">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <KitCardSkeleton />
              </li>
            ))}
          </ul>
        )}

        {kits && kits.length === 0 && (
          <div className="card flex flex-col items-center gap-3 p-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <FolderKanban className="h-6 w-6" />
            </span>
            <p className="font-medium text-ink-900">No kits yet</p>
            <p className="max-w-sm text-sm text-ink-500">
              Paste a job description and a company URL above to generate your first interview prep kit.
            </p>
          </div>
        )}

        {kits && kits.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {kits.map((kit) => (
              <li key={kit.id}>
                <Link
                  href={`/kits/${kit.id}`}
                  className="card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-lift"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{kit.role || "Untitled role"}</p>
                    <p className="truncate text-sm text-ink-500">{kit.company || "Unknown company"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {kit.readinessScore !== null && <ReadinessPill score={kit.readinessScore} />}
                    <StatusBadge status={kit.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AuthGuard>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
