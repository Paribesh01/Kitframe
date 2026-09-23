import { env } from "../config/env.js";

export interface LlmMessage {
  role: "system" | "user";
  content: string;
}

export interface LlmCallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export class LlmError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "LlmError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Thin OpenAI-chat-completions-compatible client. Works unmodified against
 * Groq, OpenAI, or any other OpenAI-compatible free-tier endpoint by
 * swapping LLM_BASE_URL / LLM_MODEL / LLM_API_KEY — no code change needed to
 * switch providers.
 */
async function rawCall(messages: LlmMessage[], options: LlmCallOptions): Promise<string> {
  if (!env.llmApiKey) {
    throw new LlmError("LLM_API_KEY is not set", false);
  }

  const response = await fetch(`${env.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.llmApiKey}`,
    },
    body: JSON.stringify({
      model: env.llmModel,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 2000,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (response.status === 429) {
    throw new LlmError("Rate limited by LLM provider", true);
  }
  if (response.status >= 500) {
    throw new LlmError(`LLM provider server error: ${response.status}`, true);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new LlmError(`LLM provider error ${response.status}: ${body.slice(0, 300)}`, false);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmError("LLM provider returned no content", true);
  }
  return content;
}

/**
 * Retries on rate limits and transient failures with exponential backoff and
 * jitter. Free-tier providers cap tokens-per-minute, not just requests, so a
 * pipeline that treats a 429 as fatal loses the run over a limit that
 * clears itself in seconds.
 */
export async function callLlm(
  messages: LlmMessage[],
  options: LlmCallOptions = {},
  maxRetries = 4,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await rawCall(messages, options);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof LlmError ? error.retryable : true;
      if (!retryable || attempt === maxRetries) {
        break;
      }
      const backoffMs = Math.min(1000 * 2 ** attempt, 15000) + Math.random() * 500;
      await sleep(backoffMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM call failed");
}

/** Extracts the first top-level JSON object/array from a model response,
 * tolerating markdown code fences and leading/trailing prose the model
 * sometimes adds despite instructions. */
export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.search(/[[{]/);
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  if (start === -1 || end === -1 || end < start) {
    throw new LlmError("Could not locate JSON in LLM response", true);
  }
  const jsonSlice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice) as T;
  } catch {
    throw new LlmError("LLM response was not valid JSON", true);
  }
}

export async function callLlmForJson<T>(
  messages: LlmMessage[],
  options: LlmCallOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callLlm(messages, { ...options, jsonMode: true });
    try {
      return extractJson<T>(raw);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM did not return valid JSON");
}
