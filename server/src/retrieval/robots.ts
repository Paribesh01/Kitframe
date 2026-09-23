import robotsParserPkg from "robots-parser";

interface Robot {
  isAllowed(url: string, ua?: string): boolean | undefined;
}

const robotsParser = robotsParserPkg as unknown as (url: string, robotstxt: string) => Robot;

const cache = new Map<string, Robot | null>();

async function loadRobots(origin: string): Promise<Robot | null> {
  if (cache.has(origin)) return cache.get(origin) ?? null;
  try {
    const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      cache.set(origin, null);
      return null;
    }
    const body = await res.text();
    const parser = robotsParser(`${origin}/robots.txt`, body);
    cache.set(origin, parser);
    return parser;
  } catch {
    cache.set(origin, null);
    return null;
  }
}

/** Defaults to allowed when robots.txt is missing or unreachable. */
export async function isAllowedByRobots(url: string, userAgent = "InterviewPrepKitBot"): Promise<boolean> {
  const origin = new URL(url).origin;
  const parser = await loadRobots(origin);
  if (!parser) return true;
  return parser.isAllowed(url, userAgent) ?? true;
}
