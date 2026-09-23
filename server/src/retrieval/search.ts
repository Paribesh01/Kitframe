import * as cheerio from "cheerio";
import { assertSafeUrl } from "./urlSafety.js";
import { isAllowedByRobots } from "./robots.js";
import { globalRateLimiter } from "./rateLimiter.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchOutcome {
  results: SearchResult[];
  skipped: { source: string; reason: string }[];
}

const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";
const DISCUSSION_DOMAINS = ["glassdoor", "reddit.com", "blind.com", "levels.fyi", "medium.com"];

/**
 * Looks for public discussion of a company's interview process via
 * DuckDuckGo's no-JS HTML endpoint (no API key required — fits the "genuine
 * free tier" constraint since there is no tier at all to exhaust). Treated
 * as best-effort: search engines rate-limit and occasionally block
 * scrapers, so a failure here is recorded and skipped, never fatal to the
 * whole kit.
 */
export async function searchPublicDiscussion(companyName: string): Promise<SearchOutcome> {
  const query = `${companyName} interview process questions experience`;
  const skipped: SearchOutcome["skipped"] = [];

  try {
    const url = await assertSafeUrl(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`);
    const allowed = await isAllowedByRobots(url.toString(), "InterviewPrepKitBot");
    if (!allowed) {
      skipped.push({ source: "duckduckgo", reason: "Disallowed by robots.txt" });
      return { results: [], skipped };
    }

    const response = await globalRateLimiter.run(url.host, () =>
      fetch(url.toString(), {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "InterviewPrepKitBot/1.0" },
      }),
    );

    if (!response.ok) {
      skipped.push({ source: "duckduckgo", reason: `HTTP ${response.status}` });
      return { results: [], skipped };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $(".result").each((_, el) => {
      const link = $(el).find(".result__a").first();
      const href = link.attr("href");
      const title = link.text().trim();
      const snippet = $(el).find(".result__snippet").first().text().trim();
      if (href && title) {
        results.push({ title, url: href, snippet });
      }
    });

    const ranked = results
      .map((r) => ({
        ...r,
        weight: DISCUSSION_DOMAINS.some((d) => r.url.includes(d)) ? 1 : 0,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(({ title, url: u, snippet }) => ({ title, url: u, snippet }));

    if (ranked.length === 0) {
      skipped.push({ source: "duckduckgo", reason: "No results found" });
    }

    return { results: ranked, skipped };
  } catch (error) {
    skipped.push({ source: "duckduckgo", reason: error instanceof Error ? error.message : String(error) });
    return { results: [], skipped };
  }
}
