import { readFile, writeFile } from "node:fs/promises";
import { generateKit } from "../pipeline/orchestrator.js";
import type { Kit } from "../kit/schema.js";

interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

interface BatchKitEntry {
  id: string;
  status: "ok" | "failed";
  kit: Kit | null;
  error: { code: string; message: string } | null;
}

function parseArgs(argv: string[]): { input: string; output: string } {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input" || argv[i] === "--output") {
      args.set(argv[i].slice(2), argv[i + 1]);
      i += 1;
    }
  }
  const input = args.get("input");
  const output = args.get("output");
  if (!input || !output) {
    throw new Error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
  }
  return { input, output };
}

function errorCodeFor(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/LLM_API_KEY/i.test(message)) return "LLM_NOT_CONFIGURED";
  if (/rate limit/i.test(message)) return "RATE_LIMITED";
  if (/validation/i.test(message)) return "INVALID_KIT_STRUCTURE";
  if (/invalid url|unsupported protocol/i.test(message)) return "INVALID_COMPANY_URL";
  return "GENERATION_FAILED";
}

async function runCase(c: BatchCase): Promise<BatchKitEntry> {
  try {
    const kit = await generateKit({
      jobDescription: c.jd,
      companyUrl: c.company_url,
      daysAvailable: c.days,
    });
    return { id: c.id, status: "ok", kit, error: null };
  } catch (error) {
    return {
      id: c.id,
      status: "failed",
      kit: null,
      error: {
        code: errorCodeFor(error),
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));

  const raw = await readFile(input, "utf-8");
  const cases = JSON.parse(raw) as BatchCase[];

  const kits: BatchKitEntry[] = [];
  for (const c of cases) {
    process.stderr.write(`[evaluate] running case ${c.id}...\n`);
    const result = await runCase(c);
    process.stderr.write(`[evaluate] case ${c.id}: ${result.status}\n`);
    kits.push(result);
  }

  const outputPayload = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits,
  };

  await writeFile(output, JSON.stringify(outputPayload, null, 2), "utf-8");
  process.stderr.write(`[evaluate] wrote ${kits.length} result(s) to ${output}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
