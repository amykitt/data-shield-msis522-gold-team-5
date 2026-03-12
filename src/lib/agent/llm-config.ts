import { z } from "zod";

import {
  createOpenAiCompatibleStructuredLlmAdapter,
  type OpenAiCompatibleStructuredLlmAdapterOptions,
  type StructuredLlmAdapter,
  StructuredLlmError,
} from "@/lib/agent/llm";

const agentLlmProviderSchema = z.enum(["openai_compatible"]);

export const agentLlmConfigSchema = z.object({
  provider: agentLlmProviderSchema.default("openai_compatible"),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  endpoint: z.string().min(1).default("/chat/completions"),
  temperature: z.number().min(0).max(2).default(0),
  headers: z.record(z.string(), z.string()).default({}),
});

export type AgentLlmProvider = z.infer<typeof agentLlmProviderSchema>;
export type AgentLlmConfig = z.infer<typeof agentLlmConfigSchema>;

export interface AgentLlmEnvLike {
  [key: string]: unknown;
}

export interface AgentLlmAdapterFactoryOptions {
  env?: AgentLlmEnvLike;
  headers?: Record<string, string>;
}

function readString(env: AgentLlmEnvLike, keys: string[]) {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function readNumber(env: AgentLlmEnvLike, keys: string[]) {
  const value = readString(env, keys);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function resolveAgentLlmConfig(env: AgentLlmEnvLike = {}, overrides: Partial<AgentLlmConfig> = {}) {
  const provider = readString(env, ["AGENT_LLM_PROVIDER", "VITE_AGENT_LLM_PROVIDER"]);
  const baseUrl = readString(env, ["AGENT_LLM_BASE_URL", "VITE_AGENT_LLM_BASE_URL"]);
  const apiKey = readString(env, ["AGENT_LLM_API_KEY", "VITE_AGENT_LLM_API_KEY"]);
  const model = readString(env, ["AGENT_LLM_MODEL", "VITE_AGENT_LLM_MODEL"]);
  const endpoint = readString(env, ["AGENT_LLM_ENDPOINT", "VITE_AGENT_LLM_ENDPOINT"]);
  const temperature = readNumber(env, ["AGENT_LLM_TEMPERATURE", "VITE_AGENT_LLM_TEMPERATURE"]);

  return agentLlmConfigSchema.parse({
    provider,
    baseUrl,
    apiKey,
    model,
    endpoint,
    temperature,
    ...overrides,
  });
}

export function createStructuredLlmAdapterFromConfig(
  config: AgentLlmConfig,
  options: Pick<OpenAiCompatibleStructuredLlmAdapterOptions, "transport"> = {},
): StructuredLlmAdapter {
  switch (config.provider) {
    case "openai_compatible":
      return createOpenAiCompatibleStructuredLlmAdapter({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        endpoint: config.endpoint,
        temperature: config.temperature,
        headers: config.headers,
        transport: options.transport,
      });
    default:
      throw new StructuredLlmError(`Unsupported structured LLM provider: ${String(config.provider)}.`);
  }
}

export function createStructuredLlmAdapterFromEnv(
  options: AgentLlmAdapterFactoryOptions & Pick<OpenAiCompatibleStructuredLlmAdapterOptions, "transport"> = {},
): StructuredLlmAdapter {
  const config = resolveAgentLlmConfig(options.env ?? {}, {
    headers: options.headers ?? {},
  });

  return createStructuredLlmAdapterFromConfig(config, {
    transport: options.transport,
  });
}
