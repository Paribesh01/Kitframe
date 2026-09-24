"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { NavBar } from "@/components/NavBar";
import { Builder } from "@/components/kit/Builder";
import { api } from "@/lib/api";
import type { KitDetail } from "@/lib/types";

function GenerationProgress({ detail }: { detail: KitDetail }) {
  return (
    <div className="card mx-auto max-w-xl p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <h2 className="text-lg font-semibold text-ink-900">
          {detail.status === "pending" ? "Queued…" : "Generating your kit…"}
        </h2>
      </div>
      <ol className="space-y-3">
        {detail.progress.length === 0 && <li className="text-sm text-ink-400">Starting up…</li>}
        {detail.progress.map((p, i) => {
          const isLast = i === detail.progress.length - 1;
          return (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              {isLast ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-500" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              )}
              <span className={isLast ? "font-medium text-ink-900" : "text-ink-500"}>{p.message}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 border-t border-ink-100 pt-4 text-xs text-ink-400">
        This can take a minute or two — the kit is built through several real research and generation
        steps, not a single prompt.
      </p>
    </div>
  );
}

function GenerationFailed({ detail }: { detail: KitDetail }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <XCircle className="h-6 w-6" />
      </span>
      <h2 className="mb-2 text-lg font-semibold text-ink-900">Generation failed</h2>
      <p className="text-sm text-ink-500">{detail.error?.message ?? "Something went wrong."}</p>
      <Link href="/dashboard" className="btn-secondary mt-5 inline-flex">
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
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!detail && !loadError && (
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

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
