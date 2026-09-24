"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Save } from "lucide-react";
import { api } from "@/lib/api";
import type { Kit } from "@/lib/types";

interface Props {
  kitId: string;
  kit: Kit;
  busy: boolean;
  onMutate: (fn: () => Promise<{ kit: Kit }>, successMessage?: string) => Promise<void>;
}

export function BriefTab({ kitId, kit, busy, onMutate }: Props) {
  const [summary, setSummary] = useState(kit.company_brief.summary);
  const [whatTheyDo, setWhatTheyDo] = useState(kit.company_brief.what_they_do);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSummary(kit.company_brief.summary);
    setWhatTheyDo(kit.company_brief.what_they_do);
    setDirty(false);
  }, [kit.company_brief.summary, kit.company_brief.what_they_do]);

  return (
    <div className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="summary">
          Summary
        </label>
        <textarea
          id="summary"
          className="input min-h-[80px]"
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            setDirty(true);
          }}
        />
      </div>
      <div>
        <label className="label" htmlFor="what-they-do">
          What they do
        </label>
        <textarea
          id="what-they-do"
          className="input min-h-[100px]"
          value={whatTheyDo}
          onChange={(e) => {
            setWhatTheyDo(e.target.value);
            setDirty(true);
          }}
        />
      </div>

      {kit.company_brief.sources.length > 0 && (
        <div>
          <p className="label">Sources used</p>
          <ul className="space-y-1 text-sm">
            {kit.company_brief.sources.map((s) => (
              <li key={s} className="truncate">
                <a
                  href={s}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-ink-100 pt-4">
        <button
          className="btn-primary"
          disabled={!dirty || busy}
          onClick={() =>
            onMutate(
              () =>
                api.patch<{ kit: Kit }>(`/api/kits/${kitId}/company-brief`, {
                  summary,
                  what_they_do: whatTheyDo,
                }),
              "Brief saved",
            ).then(() => setDirty(false))
          }
        >
          <Save className="h-4 w-4" />
          Save changes
        </button>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() =>
            onMutate(
              () => api.post<{ kit: Kit }>(`/api/kits/${kitId}/company-brief/regenerate`),
              "Brief regenerated",
            )
          }
        >
          <RefreshCw className="h-4 w-4" />
          Regenerate brief
        </button>
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
      </div>
    </div>
  );
}
