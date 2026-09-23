"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { NavBar } from "@/components/NavBar";
import { Builder } from "@/components/kit/Builder";
import { api } from "@/lib/api";
import type { KitDetail } from "@/lib/types";

function GenerationProgress({ detail }: { detail: KitDetail }) {
  return (
    <div className="card mx-auto max-w-xl p-6">
      <h2 className="mb-4 text-lg font-semibold">
        {detail.status === "pending" ? "Queued…" : "Generating your kit…"}
      </h2>
      <ol className="space-y-2">
        {detail.progress.length === 0 && <li className="text-sm text-slate-500">Starting up…</li>}
        {detail.progress.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
            {p.message}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-400">
        This can take a minute or two — the kit is built through several real research and generation
        steps, not a single prompt.
      </p>
    </div>
  );
}

function GenerationFailed({ detail }: { detail: KitDetail }) {
  return (
    <div className="card mx-auto max-w-xl p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold text-red-700">Generation failed</h2>
      <p className="text-sm text-slate-600">{detail.error?.message ?? "Something went wrong."}</p>
      <Link href="/dashboard" className="btn-secondary mt-4 inline-flex">
        Back to dashboard
      </Link>
    </div>
  );
}

function KitDetailContent() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<KitDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<KitDetail>(`/api/kits/${params.id}`);
      setDetail(res);
      setLoadError(null);
    } catch {
      setLoadError("Could not load this kit.");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (detail?.status !== "pending" && detail?.status !== "generating") return;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [detail?.status, load]);

  return (
    <AuthGuard>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
          &larr; Back to dashboard
        </Link>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!detail && !loadError && <p className="text-sm text-slate-500">Loading…</p>}

        {detail && (detail.status === "pending" || detail.status === "generating") && (
          <GenerationProgress detail={detail} />
        )}
        {detail && detail.status === "failed" && <GenerationFailed detail={detail} />}
        {detail && detail.status === "ready" && detail.kit && (
          <Builder kitId={params.id} initialDetail={detail} onRefresh={load} />
        )}
      </main>
    </AuthGuard>
  );
}

export default function KitDetailPage() {
  return <KitDetailContent />;
}
