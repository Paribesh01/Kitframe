"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Kit } from "@/lib/types";

interface Props {
  kitId: string;
  kit: Kit;
  busy: boolean;
  onMutate: (fn: () => Promise<{ kit: Kit }>) => Promise<void>;
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
          <ul className="space-y-1 text-sm text-brand-600">
            {kit.company_brief.sources.map((s) => (
              <li key={s} className="truncate">
                <a href={s} target="_blank" rel="noreferrer" className="hover:underline">
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={!dirty || busy}
          onClick={() =>
            onMutate(() =>
              api.patch<{ kit: Kit }>(`/api/kits/${kitId}/company-brief`, {
                summary,
                what_they_do: whatTheyDo,
              }),
            ).then(() => setDirty(false))
          }
        >
          Save changes
        </button>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() => onMutate(() => api.post<{ kit: Kit }>(`/api/kits/${kitId}/company-brief/regenerate`))}
        >
          Regenerate brief
        </button>
      </div>
    </div>
  );
}
