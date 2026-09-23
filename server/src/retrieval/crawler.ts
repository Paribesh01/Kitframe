import { fetchAndCleanPage, RetrievalError, type FetchedPage } from "./fetchPage.js";

const HIRING_KEYWORDS = [
  "career",
  "careers",
  "job",
  "jobs",
  "hiring",
  "join us",
  "join-us",
  "work with us",
  "life at",
  "life-at",
  "talent",
  "openings",
  "open roles",
  "handbook",
  "interview process",
  "interview-process",
  "how we hire",
  "how-we-hire",
];

const ABOUT_KEYWORDS = ["about", "company", "mission", "who we are", "who-we-are", "team", "story"];

export interface CrawlResult {
  pages: FetchedPage[];
  skipped: { url: string; reason: string }[];
  hiringPageFound: boolean;
}

function score(href: string, text: string, keywords: string[]): number {
  const haystack = `${href} ${text}`.toLowerCase();
  let total = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) total += kw.length >= 8 ? 3 : 2;
  }
  return total;
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/**
 * Crawls a company site starting from its homepage to find "what they do"
 * and "how they hire" pages. There is no fixed path list: every discovered
 * link is scored against hiring/about keyword sets and the highest scoring
 * candidates are fetched next, up to a page budget. A hiring-focused page,
 * once found, is crawled one level deeper (e.g. a /careers page that links
 * to a dedicated "our interview process" page).
 */
export async function crawlCompanySite(
  homepageUrl: string,
  options: { maxPages?: number } = {},
): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? 6;
  const pages: FetchedPage[] = [];
  const skipped: { url: string; reason: string }[] = [];
  const visited = new Set<string>();

  let homepage: FetchedPage;
  try {
    homepage = await fetchAndCleanPage(homepageUrl);
  } catch (error) {
    skipped.push({ url: homepageUrl, reason: error instanceof Error ? error.message : String(error) });
    return { pages, skipped, hiringPageFound: false };
  }
  pages.push(homepage);
  visited.add(homepage.url);

  const scoredLinks = homepage.links
    .filter((l) => sameOrigin(l.href, homepage.url) && !visited.has(l.href))
    .map((l) => ({
      ...l,
      hiringScore: score(l.href, l.text, HIRING_KEYWORDS),
      aboutScore: score(l.href, l.text, ABOUT_KEYWORDS),
    }))
    .filter((l) => l.hiringScore > 0 || l.aboutScore > 0)
    .sort((a, b) => b.hiringScore + b.aboutScore - (a.hiringScore + a.aboutScore));

  const dedupedByPath = new Map<string, (typeof scoredLinks)[number]>();
  for (const link of scoredLinks) {
    const key = new URL(link.href).pathname.replace(/\/$/, "");
    if (!dedupedByPath.has(key)) dedupedByPath.set(key, link);
  }

  const candidates = [...dedupedByPath.values()].slice(0, maxPages - 1);
  let hiringPageFound = false;
  const secondLevelCandidates: string[] = [];

  for (const candidate of candidates) {
    if (visited.has(candidate.href) || pages.length >= maxPages) continue;
    visited.add(candidate.href);
    try {
      const page = await fetchAndCleanPage(candidate.href);
      pages.push(page);
      if (candidate.hiringScore > 0) {
        hiringPageFound = true;
        const deeper = page.links
          .filter((l) => sameOrigin(l.href, page.url) && !visited.has(l.href))
          .map((l) => ({ ...l, s: score(l.href, l.text, HIRING_KEYWORDS) }))
          .filter((l) => l.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 2)
          .map((l) => l.href);
        secondLevelCandidates.push(...deeper);
      }
    } catch (error) {
      const reason =
        error instanceof RetrievalError ? `${error.code}: ${error.message}` : String(error);
      skipped.push({ url: candidate.href, reason });
    }
  }

  for (const url of secondLevelCandidates) {
    if (visited.has(url) || pages.length >= maxPages) continue;
    visited.add(url);
    try {
      const page = await fetchAndCleanPage(url);
      pages.push(page);
    } catch (error) {
      const reason =
        error instanceof RetrievalError ? `${error.code}: ${error.message}` : String(error);
      skipped.push({ url, reason });
    }
  }

  return { pages, skipped, hiringPageFound };
}
