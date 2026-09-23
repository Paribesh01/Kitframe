"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { NavBar } from "@/components/NavBar";
import { NewKitForm } from "@/components/NewKitForm";
import { api } from "@/lib/api";
import type { KitSummary } from "@/lib/types";

const STATUS_STYLES: Record<KitSummary["status"], string> = {
  pending: "bg-slate-100 text-slate-600",
  generating: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-xl font-semibold">Your interview prep kits</h1>

        <div className="mb-8">
          <NewKitForm onCreated={load} />
        </div>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}

        {kits === null && !loadError && <p className="text-sm text-slate-500">Loading your kits…</p>}

        {kits && kits.length === 0 && (
          <div className="card p-8 text-center text-sm text-slate-500">
            No kits yet. Paste a job description above to generate your first one.
          </div>
        )}

        {kits && kits.length > 0 && (
          <ul className="space-y-3">
            {kits.map((kit) => (
              <li key={kit.id}>
                <Link
                  href={`/kits/${kit.id}`}
                  className="card flex items-center justify-between p-4 hover:border-brand-400"
                >
                  <div>
                    <p className="font-medium text-slate-900">{kit.role || "Untitled role"}</p>
                    <p className="text-sm text-slate-500">{kit.company || "Unknown company"}</p>
                  </div>
                  <span className={`badge ${STATUS_STYLES[kit.status]}`}>{kit.status}</span>
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
