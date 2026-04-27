import OpenAI from "openai";
import { getRequiredServerEnv, type ServerEnvInput } from "@/lib/env";

type OpenAIConstructor<T> = new (options: { apiKey: string }) => T;

let cachedOpenAIClient: OpenAI | null = null;

export function createOpenAIClient<T = OpenAI>(
  rawEnv: ServerEnvInput = process.env,
  OpenAIClient: OpenAIConstructor<T> = OpenAI as unknown as OpenAIConstructor<T>,
): T {
  const env = getRequiredServerEnv(rawEnv);

  return new OpenAIClient({ apiKey: env.OPENAI_API_KEY });
}

export function getOpenAIClient() {
  if (!cachedOpenAIClient) {
    cachedOpenAIClient = createOpenAIClient();
  }

  return cachedOpenAIClient;
}
