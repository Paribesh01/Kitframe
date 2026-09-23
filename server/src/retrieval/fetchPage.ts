import * as cheerio from "cheerio";
import { assertSafeUrl } from "./urlSafety.js";
import { isAllowedByRobots } from "./robots.js";
import { globalRateLimiter } from "./rateLimiter.js";

const MAX_BYTES = 3_000_000;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  links: { href: string; text: string }[];
}

export class RetrievalError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOnce(url: string): Promise<Response> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "InterviewPrepKitBot/1.0 (+https://example.com/bot)" },
    redirect: "follow",
  });
  return res;
}

/**
 * Retrieves and cleans a single page: safety + robots checks, rate limiting,
 * content-type/size restriction, retry-with-backoff on transient failure,
 * and reduction to plain text plus outgoing links for the crawler to rank.
 */
export async function fetchAndCleanPage(rawUrl: string): Promise<FetchedPage> {
  const safeUrl = await assertSafeUrl(rawUrl);

  const allowed = await isAllowedByRobots(safeUrl.toString());
  if (!allowed) {
    throw new RetrievalError(`Disallowed by robots.txt: ${safeUrl}`, "ROBOTS_DISALLOWED");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await globalRateLimiter.run(safeUrl.host, () => fetchOnce(safeUrl.toString()));

      if (response.status === 404) {
        throw new RetrievalError(`404 Not Found: ${safeUrl}`, "NOT_FOUND");
      }
      if (response.status === 429 || response.status >= 500) {
        throw new RetrievalError(`Transient error ${response.status}: ${safeUrl}`, "TRANSIENT");
      }
      if (!response.ok) {
        throw new RetrievalError(`HTTP ${response.status}: ${safeUrl}`, "HTTP_ERROR");
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
        throw new RetrievalError(`Unsupported content-type: ${contentType}`, "UNSUPPORTED_TYPE");
      }

      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (contentLength > MAX_BYTES) {
        throw new RetrievalError(`Page too large: ${contentLength} bytes`, "TOO_LARGE");
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) {
        throw new RetrievalError(`Page too large: ${buffer.byteLength} bytes`, "TOO_LARGE");
      }

      const html = Buffer.from(buffer).toString("utf-8");
      return parseHtml(safeUrl.toString(), html);
    } catch (error) {
      lastError = error;
      const isTransient =
        error instanceof RetrievalError
          ? error.code === "TRANSIENT"
          : true;
      if (!isTransient || attempt === 2) break;
      await sleep(500 * 2 ** attempt);
    }
  }

  if (lastError instanceof RetrievalError) throw lastError;
  throw new RetrievalError(`Failed to fetch ${safeUrl}: ${String(lastError)}`, "FETCH_FAILED");
}

function parseHtml(url: string, html: string): FetchedPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();

  const title = $("title").first().text().trim();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 20_000);

  const links: { href: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const linkText = $(el).text().trim();
    if (!href) return;
    try {
      const resolved = new URL(href, url).toString();
      links.push({ href: resolved, text: linkText });
    } catch {
      // ignore malformed hrefs
    }
  });

  return { url, title, text, links };
}
