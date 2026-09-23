# AI Interview Prep Kit

Turns a pasted job description + a company URL into a structured, editable interview
preparation kit: a company brief, role breakdown, categorised question bank, flashcards,
and a day-by-day study schedule — generated through a real multi-step research and
generation pipeline, not a single prompt.

## Tech stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Node.js + Express (TypeScript, ESM)
- **Database:** MongoDB (Mongoose)
- **LLM:** any OpenAI-chat-completions-compatible endpoint — defaults to **Groq**
  (`llama-3.3-70b-versatile`), which has a genuinely free tier and is fast enough to make
  the 15-minute batch budget comfortable. Switching to OpenAI, Together, Fireworks, etc.
  requires only changing three env vars (`LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`) — no
  code change.
- **Scraping:** hand-rolled fetch + `cheerio`, no headless browser (the target pages are
  static marketing/careers pages, not SPAs that need JS execution)
- **Search:** DuckDuckGo's no-JS HTML endpoint, scraped directly — no API key exists to
  need a "free tier" for, and it's genuinely free

This is a monorepo (`npm` workspaces): [`server/`](server) is the API + pipeline +
batch entry point, [`web/`](web) is the Next.js frontend.

## Setup

### Prerequisites
- Node.js 20+
- MongoDB running locally (`brew install mongodb-community` or Docker), or a free
  MongoDB Atlas cluster
- A free-tier API key from an OpenAI-compatible provider (Groq recommended:
  console.groq.com — free, no card required)

### Install

```bash
npm install          # installs both workspaces from the repo root
```

### Configure

```bash
cp server/.env.example server/.env      # fill in MONGO_URI, JWT_SECRET, LLM_API_KEY
cp web/.env.local.example web/.env.local
```

Every env var is documented inline in `server/.env.example`.

### Run locally

```bash
npm run dev:server     # http://localhost:4000
npm run dev:web        # http://localhost:3000
```

### Run the batch entry point (Section 9)

```bash
cd server
npm run evaluate -- --input <cases.json> --output <kits.json>
```

This runs from a clean clone with no setup beyond `npm install` and a `.env` with
`LLM_API_KEY` set — it does **not** need MongoDB (the batch path doesn't persist
anything, only reads cases and writes kits). A sample cases file and a tiny local
fixture "company site" are included so you can try it immediately:

```bash
npm run fixtures:serve                          # serves fixture sites on :8099
npm run evaluate -- --input fixtures/cases.sample.json --output /tmp/kits.json
```

`fixtures/cases.sample.json` deliberately includes a thin two-line JD, a company with
no hiring page, an unreachable URL, and a 30-day schedule request, matching the edge
cases the brief says are graded.

### Tests

```bash
cd server && npm test
```

Covers schedule allocation, coverage checking, and kit structure validation — the three
pieces of deterministic logic the brief calls out as most worth protecting.

## High-level architecture

```
web/            Next.js app: auth pages, dashboard, kit builder, practice mode
server/
  src/
    retrieval/  URL safety (SSRF guard), robots.txt, rate limiting, page fetch/clean,
                crawler (link ranking, no fixed path list), DuckDuckGo search
    llm/        Thin OpenAI-compatible client with retry/backoff on 429s and 5xxs
    kit/        schema.ts (Appendix A shape + validation), coverage.ts, scheduler.ts
                — all pure, deterministic, unit-tested, no model calls
    pipeline/   extractRequirements, companyBrief, generateQuestions, generateFlashcards,
                regenerate, orchestrator.ts (wires the whole sequence together)
    models/     Mongoose schemas: User, Kit
    routes/     auth.ts, kits.ts (builder + practice endpoints)
    batch/      evaluate.ts — the Section 9 CLI entry point, calls the same
                orchestrator the web app uses
```

Retrieval, extraction/generation, scheduling, and persistence are separate modules;
`orchestrator.ts` is the only place that sequences them, and both the web API and the
batch command call it — there is no parallel implementation for the batch path.

## Retrieval approach and sources used

1. **Company site crawl** (`retrieval/crawler.ts`): fetch the homepage, extract every
   same-origin link, score each by keyword match against a hiring-keyword set
   (`career`, `jobs`, `handbook`, `how we hire`, `interview process`, …) and an
   about-keyword set. Highest-scoring candidates are fetched next (up to a page budget).
   If a hiring-scored page is fetched, its own links are scored and the top few crawled
   one level deeper — this is how a `/careers` page that links out to a separate
   `/engineering-handbook` interview-process page gets picked up without either path
   being hard-coded.
2. **Public discussion search** (`retrieval/search.ts`): DuckDuckGo's HTML endpoint,
   query `"<company> interview process questions experience"`, results re-ranked toward
   known discussion domains (Glassdoor, Reddit, Blind, levels.fyi). Best-effort: a
   failure or empty result set is recorded and skipped, never fatal.

Every fetch goes through `retrieval/urlSafety.ts` (rejects non-http(s) schemes always;
in production, resolves the hostname and rejects private/loopback/link-local addresses),
`retrieval/robots.ts` (skips a page robots.txt disallows), and a per-host rate
limiter/backoff (`retrieval/rateLimiter.ts`, `fetchPage.ts`) that retries transient
failures with exponential backoff and gives up cleanly (recorded as a skip) on
persistent ones — so an unreachable or slow-to-respond site degrades the kit's research
depth rather than failing the whole run.

## Sequencing: research → generation → coverage

`pipeline/orchestrator.ts` runs, in order:

1. **Extract requirements** from the pasted JD (LLM, low temperature) — the only step
   that decides what the requirements are; every later step treats this as ground truth.
2. **Crawl the company site** and **search for public discussion** (deterministic code,
   run in parallel with each other, not with step 1 — the JD needs no retrieval at all,
   but the questions the company steps produce depend on what's found).
3. **Write the company brief** from whatever pages/search results came back — honestly
   says "no public information found" rather than inventing detail if nothing came back.
4. **Generate questions per requirement**, one category at a time, with a distinct
   prompt per category (`pipeline/generateQuestions.ts`): a technical requirement gets a
   technical-implementation prompt, a behavioural one gets a STAR-format prompt, and if
   the discovered hiring-process text mentions a system-design round, must-have technical
   requirements also get a system-design question — from a third, separately-instructed
   call. These are never the same LLM call with the same instructions.
5. **Check coverage** (`kit/coverage.ts`, pure function, no model call): any requirement
   with no question referencing its id is a gap; must-have gaps are tracked separately.
6. **Second pass**: for each uncovered must-have, generate one more targeted question and
   re-check. Capped at 3 total passes (`MAX_COVERAGE_PASSES`) — in practice the first
   pass covers nearly everything since every requirement gets a question by construction,
   so the second pass exists mainly to catch a requirement the model skipped or an
   empty/malformed generation response, not to paper over systematically bad output. If
   gaps remain after 3 passes they're reported honestly in `coverage.uncovered_requirement_ids`
   rather than silently dropped or invented.
7. **Generate flashcards** from the finished question bank.
8. **Build the schedule** (`kit/scheduler.ts`, pure function, no model call): sorts
   questions by priority-then-difficulty (must-have and harder material first), greedily
   bins them into exactly `daysAvailable` days by target minutes/day, and pads with
   spaced-review days (light re-exposure to earlier questions) when there are more days
   than material — see "How the schedule is allocated" below.
9. **Validate** the assembled kit against the Appendix A shape plus referential-integrity
   checks (every `question_ids`/`requirement_ids` reference resolves) before it's
   returned or saved.

## How many coverage passes, and why

Capped at 3. Requirement extraction and question generation are already 1:1 by
construction (every requirement gets a question in step 4), so an uncovered must-have
after pass 1 almost always means a single malformed/empty LLM response for that one
requirement, not a systemic gap — one retry pass fixes that. A third pass is a safety
margin for a flaky provider under rate-limit pressure. Beyond that, more retries just
burn tokens-per-minute budget without changing the outcome, so remaining gaps are
recorded in `coverage.uncovered_requirement_ids` and surfaced to the user in the builder
UI rather than looped on indefinitely.

## Generated / edited / pinned state (the builder's state model)

Each `Kit` document stores an `itemState: { [questionOrFlashcardId]: "generated" | "edited" | "manual" }`
map alongside the kit content (this is a deliberate extension beyond Appendix A — the
brief allows extending the structure where it genuinely helps, and this is not part of
the batch-graded shape). Rules, enforced in `pipeline/regenerate.ts`:

- Freshly generated items start `"generated"`.
- Any edit through the builder API flips that item to `"edited"`.
- Any hand-added item is `"manual"` from the start.
- **Regenerating a question category** only replaces items still marked `"generated"`
  in that category. `"edited"` and `"manual"` items are left untouched, and the
  requirement(s) they reference are skipped when deciding what to regenerate — so
  regeneration can't create duplicate coverage of a requirement the user already has a
  hand-tuned question for.
- **Regenerating the company brief** is the one whole-section replace with no per-field
  pinning — the brief isn't itemized, so "regenerate" means what it says. Edits to every
  other section are unaffected.
- **Regenerating the schedule** is just a deterministic recompute over whatever
  questions currently exist (edited, manual, or generated) — there's nothing to pin
  because it has no independent content, only derived structure.

This was the hardest state problem in the assessment; the id-keyed side-table (rather
than, say, a diff/patch log) was chosen because it makes "is this safe to overwrite"
an O(1) lookup at regeneration time and keeps the Appendix A kit shape untouched.

## How the schedule is allocated

Pure arithmetic in `kit/scheduler.ts`, no LLM call:

1. Each question gets a fixed minutes estimate from its `difficulty` (15/25/40 min).
2. Questions are sorted must-have-first, then hardest-first, so difficult and
   high-priority material lands in earlier days.
3. Sorted questions are greedily packed into `min(daysAvailable, questionCount)` buckets
   targeting `totalMinutes / bucketCount` minutes each, reserving enough remaining
   buckets so no bucket is starved late.
4. If there are more days than questions (the 60-day case), the leftover days become
   spaced-review days that light-touch re-cycle earlier questions rather than sitting
   empty.
5. If there's only 1 day, everything lands on day 1.

Every must-have requirement's question is guaranteed to appear somewhere because every
generated question — must-have or not — is placed into exactly one bucket; nothing is
dropped.

## Edge cases and failure handling

| Case | Behaviour |
|---|---|
| Invalid/404/timeout company URL | `urlSafety`/`fetchPage` reject or the request fails; crawler catches it, records a skip, kit still generates with an honest, sourceless brief |
| No discoverable hiring/about page | Crawl proceeds with whatever was found (often just the homepage); brief says so explicitly instead of inventing a hiring process |
| Two-line JD stub | Extraction returns a short requirement list rather than padding it; the kit is thin and honest about it |
| No public discussion found | `search.ts` returns an empty result set with a recorded skip reason; brief notes it plainly |
| Model returns invalid/incomplete JSON | `llm/client.ts` retries the call once with the fenced/prose-tolerant extractor before giving up; `validateKit` catches anything that still slips through before persistence |
| Rate limit / transient provider failure | Exponential backoff + jitter, up to 4 retries, on both the LLM client and the page fetcher |
| Same description + company submitted twice | `Kit.dedupeKey` (hash of user + JD + URL); a repeat POST while a prior non-failed kit exists returns that kit instead of starting a duplicate run |
| 1-day or 60-day schedule | Handled by the scheduler as described above — everything on day 1, or padded with review days |

Batch-specific: a case is only recorded `"failed"` when no kit could be produced at all
(e.g. requirement extraction itself threw after retries, or the LLM key is missing/rate
limited past retry). A case with a missing hiring page or thin JD is `"ok"`, with the
gaps visible in the kit's `company_brief` and `coverage` fields — per the brief, a
partially-researched case is not a failure.

## Security

- `retrieval/urlSafety.ts`: rejects non-http(s) schemes always; in production, resolves
  the hostname and rejects private/loopback/link-local IP ranges (SSRF guard). Localhost
  is allowed outside production specifically because Section 9's batch command is tested
  against a locally-served company site — the code path doesn't special-case a
  particular host, it's gated on `NODE_ENV`.
- `fetchPage.ts` restricts to `text/html`/`application/xhtml+xml` and caps page size at
  3MB, checked against both the `Content-Length` header and the actual downloaded size.
- Every fetched page and every pasted JD is treated as data, never instructions: all LLM
  system prompts explicitly say so, and nothing from a fetched page or JD is ever
  interpolated into a position where it could be read as a system-level instruction.
- Sessions are httpOnly, `sameSite: lax` JWT cookies; expired/invalid sessions return a
  structured 401 (`SESSION_EXPIRED` vs `NOT_AUTHENTICATED`) rather than silently
  degrading; every kit route is scoped to `req.userId`, so one user can never read or
  mutate another's kit even with a guessed id.

## Deployment

- **Backend:** any Node host with a free tier (Render, Railway, Fly.io). Set the env
  vars from `server/.env.example`, build with `npm run build --workspace=server`, start
  with `npm run start --workspace=server`.
- **Frontend:** Vercel (native Next.js support, free tier). Set `NEXT_PUBLIC_API_URL` to
  the deployed backend URL, and set `CORS_ORIGIN` on the backend to the deployed
  frontend URL.
- **Database:** MongoDB Atlas free tier (M0).
- **LLM:** Groq free tier, or any other OpenAI-compatible free tier — no code change.

## Known limitations

- The DuckDuckGo HTML scrape is best-effort and can be blocked/rate-limited by the
  search engine itself under heavy use; it's treated as optional research, never
  blocking, but a paid search API (Serper, Brave Search) would be more reliable in
  production.
- Batch generation runs cases sequentially rather than concurrently, trading some wall
  clock time for staying comfortably under free-tier tokens-per-minute limits — with
  Groq this still comfortably meets the 5-cases/15-minutes budget in testing.
- Reordering/moving questions between categories is implemented with explicit
  up/down/move controls rather than drag-and-drop, which keeps it fully keyboard-
  accessible at the cost of being slightly less fluid than a drag interaction.
