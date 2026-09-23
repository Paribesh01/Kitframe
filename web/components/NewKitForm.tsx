"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { parseBatchFile, type BatchCaseInput } from "@/lib/parseBatchFile";

export function NewKitForm({ onCreated }: { onCreated: () => void }) {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [jobDescription, setJobDescription] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [daysAvailable, setDaysAvailable] = useState(5);
  const [batchCases, setBatchCases] = useState<BatchCaseInput[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const cases = await parseBatchFile(file);
      setBatchCases(cases);
      setError(null);
    } catch {
      setError("Could not parse that file. Expected JSON array or CSV with jd, company_url, days columns.");
      setBatchCases([]);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "single") {
        await api.post("/api/kits", { jobDescription, companyUrl, daysAvailable });
        setJobDescription("");
        setCompanyUrl("");
      } else {
        if (batchCases.length === 0) {
          setError("Upload a file with at least one description/company pair first.");
          setSubmitting(false);
          return;
        }
        await api.post("/api/kits/batch", { cases: batchCases });
        setBatchCases([]);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Kit creation mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "single"}
          className={mode === "single" ? "btn-primary" : "btn-secondary"}
          onClick={() => setMode("single")}
        >
          Paste one role
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "batch"}
          className={mode === "batch" ? "btn-primary" : "btn-secondary"}
          onClick={() => setMode("batch")}
        >
          Upload multiple roles
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "single" ? (
          <>
            <div>
              <label className="label" htmlFor="jd">
                Job description
              </label>
              <textarea
                id="jd"
                required
                className="input min-h-[160px]"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="companyUrl">
                  Company website
                </label>
                <input
                  id="companyUrl"
                  type="url"
                  required
                  className="input"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://company.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="days">
                  Days until interview
                </label>
                <input
                  id="days"
                  type="number"
                  min={1}
                  max={60}
                  required
                  className="input"
                  value={daysAvailable}
                  onChange={(e) => setDaysAvailable(Number(e.target.value))}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="label" htmlFor="batchFile">
              File of description/company pairs (JSON array or CSV)
            </label>
            <input
              id="batchFile"
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,text/csv,application/json"
              className="input"
              onChange={onFileChange}
            />
            {fileName && (
              <p className="mt-2 text-sm text-slate-600">
                {fileName}: {batchCases.length} role(s) detected
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Starting…" : mode === "single" ? "Generate kit" : "Generate kits"}
        </button>
      </form>
    </div>
  );
}
