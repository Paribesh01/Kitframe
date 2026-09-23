import type { Kit } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  must: "bg-red-100 text-red-700",
  nice: "bg-slate-100 text-slate-600",
};

export function RequirementsTab({ kit }: { kit: Kit }) {
  return (
    <div className="card space-y-5 p-5">
      <div>
        <p className="label">Responsibilities</p>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          {kit.role.responsibilities.length === 0 && (
            <li className="list-none text-slate-400">None extracted.</li>
          )}
          {kit.role.responsibilities.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="label">Requirements ({kit.role.requirements.length})</p>
        {kit.role.requirements.length === 0 && (
          <p className="text-sm text-slate-400">
            This job description didn&apos;t contain enough detail to extract concrete requirements.
          </p>
        )}
        <ul className="space-y-2">
          {kit.role.requirements.map((r) => {
            const uncovered = kit.coverage.uncovered_requirement_ids.includes(r.id);
            return (
              <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="text-sm text-slate-800">{r.text}</p>
                  <p className="mt-1 text-xs text-slate-400">{r.kind}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`badge ${PRIORITY_STYLES[r.priority]}`}>{r.priority}</span>
                  {uncovered && <span className="badge bg-amber-100 text-amber-700">no question yet</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
