"use client";

import { api } from "@/lib/api";
import type { Kit } from "@/lib/types";

interface Props {
  kitId: string;
  kit: Kit;
  busy: boolean;
  onMutate: (fn: () => Promise<{ kit: Kit }>) => Promise<void>;
}

export function ScheduleTab({ kitId, kit, busy, onMutate }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">
          {kit.schedule.days_available} day(s) requested · {kit.coverage.passes} coverage pass(es)
        </p>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() => onMutate(() => api.post<{ kit: Kit }>(`/api/kits/${kitId}/schedule/regenerate`))}
        >
          Recompute schedule
        </button>
      </div>

      <ol className="space-y-3">
        {kit.schedule.days.map((day) => (
          <li key={day.day} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-ink-900">Day {day.day}</p>
              <span className="badge bg-ink-100 text-ink-600">{day.minutes} min</span>
            </div>
            <p className="mb-2 text-sm text-ink-600">{day.focus}</p>
            <ul className="space-y-1 text-sm text-ink-700">
              {day.question_ids.map((qid) => {
                const q = kit.questions.find((qq) => qq.id === qid);
                return <li key={qid}>{q ? q.prompt : qid}</li>;
              })}
              {day.question_ids.length === 0 && <li className="text-ink-400">Free day</li>}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
