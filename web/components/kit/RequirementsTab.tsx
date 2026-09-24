import { Briefcase, Code2, ListTodo, Users } from "lucide-react";
import type { Kit, RequirementKind } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  must: "bg-red-100 text-red-700",
  nice: "bg-ink-100 text-ink-600",
};

const KIND_META: Record<RequirementKind, { icon: typeof Code2; className: string }> = {
  technical: { icon: Code2, className: "bg-blue-50 text-blue-600" },
  behavioural: { icon: Users, className: "bg-purple-50 text-purple-600" },
  domain: { icon: Briefcase, className: "bg-amber-50 text-amber-600" },
};

export function RequirementsTab({ kit }: { kit: Kit }) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-medium text-ink-900">
          <ListTodo className="h-4 w-4 text-brand-600" />
          Responsibilities
        </h3>
        <ul className="space-y-1.5 text-sm text-ink-700">
          {kit.role.responsibilities.length === 0 && <li className="text-ink-400">None extracted.</li>}
          {kit.role.responsibilities.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-300" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-medium text-ink-900">
          Requirements <span className="font-normal text-ink-400">({kit.role.requirements.length})</span>
        </h3>
        {kit.role.requirements.length === 0 && (
          <p className="text-sm text-ink-400">
            This job description didn&apos;t contain enough detail to extract concrete requirements.
          </p>
        )}
        <ul className="space-y-2">
          {kit.role.requirements.map((r) => {
            const uncovered = kit.coverage.uncovered_requirement_ids.includes(r.id);
            const kindMeta = KIND_META[r.kind];
            const KindIcon = kindMeta.icon;
            return (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-ink-200 p-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${kindMeta.className}`}>
                    <KindIcon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm text-ink-800">{r.text}</p>
                    <p className="mt-0.5 text-xs capitalize text-ink-400">{r.kind}</p>
                  </div>
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
