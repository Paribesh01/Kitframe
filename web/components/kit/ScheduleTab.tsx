"use client";

import { CalendarClock, Clock3, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { Kit } from "@/lib/types";

interface Props {
  kitId: string;
  kit: Kit;
  busy: boolean;
  onMutate: (fn: () => Promise<{ kit: Kit }>, successMessage?: string) => Promise<void>;
}

export function ScheduleTab({ kitId, kit, busy, onMutate }: Props) {
  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <CalendarClock className="h-4 w-4 text-brand-600" />
          <span>
            <strong className="text-ink-900">{kit.schedule.days_available}</strong> day plan ·{" "}
            <strong className="text-ink-900">{kit.coverage.passes}</strong> coverage pass
            {kit.coverage.passes === 1 ? "" : "es"}
          </span>
        </div>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() =>
            onMutate(() => api.post<{ kit: Kit }>(`/api/kits/${kitId}/schedule/regenerate`), "Schedule recomputed")
          }
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Recompute schedule
        </button>
      </div>

      <ol className="relative space-y-4 border-l-2 border-ink-100 pl-6">
        {kit.schedule.days.map((day) => (
          <li key={day.day} className="relative">
            <span className="absolute -left-[1.9rem] flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white ring-4 ring-white">
              {day.day}
            </span>
            <div className="card p-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="font-semibold text-ink-900">{day.focus || `Day ${day.day}`}</p>
                <span className="badge shrink-0 bg-ink-100 text-ink-600">
                  <Clock3 className="h-3 w-3" />
                  {day.minutes} min
                </span>
              </div>
              {day.question_ids.length === 0 ? (
                <p className="text-sm text-ink-400">Free day — no questions scheduled.</p>
              ) : (
                <ul className="space-y-1 text-sm text-ink-700">
                  {day.question_ids.map((qid) => {
                    const q = kit.questions.find((qq) => qq.id === qid);
                    return (
                      <li key={qid} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-300" />
                        {q ? q.prompt : qid}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
