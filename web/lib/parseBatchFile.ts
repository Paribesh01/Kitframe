export interface BatchCaseInput {
  jobDescription: string;
  companyUrl: string;
  daysAvailable: number;
}

function parseCsv(text: string): BatchCaseInput[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const jdIdx = header.findIndex((h) => h.includes("jd") || h.includes("description"));
  const urlIdx = header.findIndex((h) => h.includes("company"));
  const daysIdx = header.findIndex((h) => h.includes("day"));

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      jobDescription: (cols[jdIdx] ?? "").trim(),
      companyUrl: (cols[urlIdx] ?? "").trim(),
      daysAvailable: Number(cols[daysIdx] ?? 5) || 5,
    };
  });
}

/** Accepts a JSON array of {jd|jobDescription, company_url|companyUrl, days|daysAvailable}
 * or a simple CSV with jd, company_url, days columns. */
export async function parseBatchFile(file: File): Promise<BatchCaseInput[]> {
  const text = await file.text();

  if (file.name.endsWith(".json") || text.trim().startsWith("[")) {
    const data = JSON.parse(text) as Record<string, unknown>[];
    return data.map((row) => ({
      jobDescription: String(row.jobDescription ?? row.jd ?? ""),
      companyUrl: String(row.companyUrl ?? row.company_url ?? ""),
      daysAvailable: Number(row.daysAvailable ?? row.days ?? 5) || 5,
    }));
  }

  return parseCsv(text);
}
