import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, type LanguageModel } from "ai";
import type { z } from "zod";
import { env } from "../config/env.js";

// Any OpenAI-chat-completions-compatible endpoint works unmodified here —
// Groq, OpenAI, Together, Fireworks, etc. — by swapping LLM_BASE_URL /
// LLM_MODEL / LLM_API_KEY. No code change needed to switch providers.
const provider = createOpenAI({
  apiKey: env.llmApiKey || "missing-key",
  baseURL: env.llmBaseUrl,
});

function model(): LanguageModel {
  return provider(env.llmModel);
}

export class LlmError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "LlmError";
  }
}

export interface LlmCallOptions {
  temperature?: number;
}

/**
 * Structured generation via the Vercel AI SDK's `generateObject`: the
 * response is validated (and, where the provider supports it, constrained)
 * against the given zod schema instead of being hand-parsed from free text.
 * `maxRetries` lets the SDK's own retry-with-backoff handle rate limits and
 * transient provider failures internally — free-tier providers cap tokens
 * per minute, not just requests, so a pipeline that treats the first 429 as
 * fatal loses the run over a limit that clears itself in seconds.
 */
export async function generateJson<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  options: LlmCallOptions = {},
): Promise<T> {
  if (!env.llmApiKey) {
    throw new LlmError("LLM_API_KEY is not set", false);
  }

  try {
    const result = await generateText({
      model: model(),
      system,
      prompt,
      temperature: options.temperature ?? 0.4,
      maxRetries: 4,
      output: Output.object({ schema }),
    });
    return result.output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retryable = /rate.?limit|429|timeout|ECONNRESET|fetch failed|5\d\d/i.test(message);
    throw new LlmError(`LLM generation failed: ${message}`, retryable);
  }
}
