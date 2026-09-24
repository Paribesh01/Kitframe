"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { api, ApiError } from "@/lib/api";
import type { Kit, KitDetail, QuestionCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System design",
  "company-fit": "Company fit",
};

function PrintableKit({ kit, daysAvailable }: { kit: Kit; daysAvailable: number }) {
  const must = kit.role.requirements.filter((r) => r.priority === "must");
  const nice = kit.role.requirements.filter((r) => r.priority === "nice");

  return (
    <article className="mx-auto max-w-3xl bg-white px-2 py-6 text-ink-900 print:px-0 print:py-0">
      <header className="mb-6 border-b-2 border-ink-900 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Interview Prep Kit</p>
        <h1 className="text-2xl font-bold">{kit.role.title || "Untitled role"}</h1>
        <p className="text-sm text-ink-600">
          {kit.source.company} · {kit.role.seniority || "—"} · {daysAvailable}-day plan
        </p>
      </header>

      <section className="mb-5 break-inside-avoid">
        <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-brand-700">Company brief</h2>
        <p className="text-sm leading-snug text-ink-800">{kit.company_brief.summary}</p>
        <p className="mt-1 text-sm leading-snug text-ink-700">{kit.company_brief.what_they_do}</p>
      </section>

      <section className="mb-5 break-inside-avoid">
        <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-brand-700">
          Requirements ({kit.role.requirements.length})
        </h2>
        <div className="grid grid-cols-2 gap-x-6 text-sm">
          <div>
            <p className="mb-1 font-semibold text-red-700">Must-have</p>
            <ul className="list-inside list-disc space-y-0.5 text-ink-800">
              {must.map((r) => (
                <li key={r.id}>{r.text}</li>
              ))}
              {must.length === 0 && <li className="list-none text-ink-400">None extracted</li>}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-semibold text-ink-600">Nice-to-have</p>
            <ul className="list-inside list-disc space-y-0.5 text-ink-800">
              {nice.map((r) => (
                <li key={r.id}>{r.text}</li>
              ))}
              {nice.length === 0 && <li className="list-none text-ink-400">None extracted</li>}
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-5 break-inside-avoid">
        <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-brand-700">Study schedule</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-300 text-left text-xs uppercase text-ink-500">
              <th className="py-1 pr-2">Day</th>
              <th className="py-1 pr-2">Focus</th>
              <th className="py-1 pr-2">Minutes</th>
            </tr>
          </thead>
          <tbody>
            {kit.schedule.days.map((d) => (
              <tr key={d.day} className="border-b border-ink-100">
                <td className="py-1 pr-2 font-medium">Day {d.day}</td>
                <td className="py-1 pr-2 text-ink-700">{d.focus}</td>
                <td className="py-1 pr-2 text-ink-700">{d.minutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-brand-700">
          Question bank ({kit.questions.length})
        </h2>
        {(Object.keys(CATEGORY_LABELS) as QuestionCategory[]).map((category) => {
          const questions = kit.questions.filter((q) => q.category === category);
          if (questions.length === 0) return null;
          return (
            <div key={category} className="mb-3 break-inside-avoid">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                {CATEGORY_LABELS[category]}
              </p>
              <ol className="list-inside list-decimal space-y-1.5 text-sm">
                {questions.map((q) => (
                  <li key={q.id} className="break-inside-avoid text-ink-800">
                    <span className="font-medium">{q.prompt}</span>
                    {q.answer_outline && <p className="ml-4 mt-0.5 text-xs text-ink-500">{q.answer_outline}</p>}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </section>
    </article>
  );
}

function PrintPageContent() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<KitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<KitDetail>(`/api/kits/${params.id}`)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this kit"));
  }, [params.id]);

  if (error) return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!detail || !detail.kit)
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );

  return (
    <div className="min-h-screen bg-ink-100 print:bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3 print:hidden">
        <Link
          href={`/kits/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to kit
        </Link>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>
      <div className="p-6 print:p-0">
        <div className="card p-8 print:border-0 print:p-0 print:shadow-none">
          <PrintableKit kit={detail.kit} daysAvailable={detail.daysAvailable} />
        </div>
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <AuthGuard>
      <PrintPageContent />
    </AuthGuard>
  );
}
