import type { GraphContext } from "@/lib/agent/graph";
import type { AgentWorkflowNodes } from "@/lib/agent/workflow";
import type {
  DraftOptOutInput,
  DraftOptOutOutput,
  DiscoveryResult,
  InterpretResultOutput,
  RetrieveProcedureOutput,
  ValidateConsentInput,
  ValidateConsentOutput,
} from "@/lib/agent/contracts";
import {
  draftGeneratorPrompt,
  listingClassifierPrompt,
  postExecutionVerifierPrompt,
  procedureSelectorPrompt,
  type DraftPromptInput,
  type ListingPromptInput,
  type PostExecutionPromptInput,
  type ProcedurePromptInput,
  type PromptDefinition,
  type PromptName,
} from "@/lib/agent/prompts";

export interface StructuredLlmRequest<TInput, TOutput> {
  prompt: PromptDefinition<TInput, TOutput>;
  input: TInput;
}

export interface StructuredLlmAdapter {
  generateStructured<TInput, TOutput>(request: StructuredLlmRequest<TInput, TOutput>): Promise<TOutput>;
}

export interface StructuredLlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StructuredLlmTransportRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
}

export interface StructuredLlmTransportResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type StructuredLlmTransport = (
  request: StructuredLlmTransportRequest,
) => Promise<StructuredLlmTransportResponse>;

export class StructuredLlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructuredLlmError";
  }
}

export interface OpenAiCompatibleStructuredLlmAdapterOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  endpoint?: string;
  headers?: Record<string, string>;
  temperature?: number;
  transport?: StructuredLlmTransport;
}

interface OpenAiCompatibleChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{
        type?: string;
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

type OpenAiCompatibleMessageContent =
  | string
  | Array<{
      type?: string;
      text?: string;
    }>
  | undefined;

function buildPromptMessages<TInput, TOutput>(request: StructuredLlmRequest<TInput, TOutput>): StructuredLlmMessage[] {
  return [
    {
      role: "system",
      content: request.prompt.system,
    },
    {
      role: "user",
      content: request.prompt.buildUserPrompt(request.input),
    },
  ];
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function buildEndpointUrl(baseUrl: string, endpoint: string) {
  return `${normalizeBaseUrl(baseUrl)}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

function readMessageContent(content: OpenAiCompatibleMessageContent) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
  }

  return "";
}

function parseStructuredJson(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new StructuredLlmError("Structured LLM response was empty.");
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new StructuredLlmError(
      `Structured LLM response was not valid JSON: ${error instanceof Error ? error.message : "Unknown parse error."}`,
    );
  }
}

function createDefaultTransport(): StructuredLlmTransport {
  return async function defaultTransport(request) {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    return {
      ok: response.ok,
      status: response.status,
      text: () => response.text(),
    };
  };
}

export function createOpenAiCompatibleStructuredLlmAdapter(
  options: OpenAiCompatibleStructuredLlmAdapterOptions,
): StructuredLlmAdapter {
  const transport = options.transport ?? createDefaultTransport();
  const endpointUrl = buildEndpointUrl(options.baseUrl, options.endpoint ?? "/chat/completions");

  return {
    async generateStructured<TInput, TOutput>(request: StructuredLlmRequest<TInput, TOutput>): Promise<TOutput> {
      const messages = buildPromptMessages(request);
      const response = await transport({
        url: endpointUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
          ...options.headers,
        },
        body: JSON.stringify({
          model: options.model,
          temperature: options.temperature ?? 0,
          response_format: {
            type: "json_object",
          },
          messages,
        }),
      });

      const rawText = await response.text();
      if (!response.ok) {
        let message = `Structured LLM request failed with status ${response.status}.`;

        try {
          const parsed = JSON.parse(rawText) as OpenAiCompatibleChatCompletionResponse;
          if (parsed.error?.message) {
            message = `${message} ${parsed.error.message}`;
          }
        } catch {
          if (rawText.trim()) {
            message = `${message} ${rawText.trim()}`;
          }
        }

        throw new StructuredLlmError(message);
      }

      let parsedResponse: OpenAiCompatibleChatCompletionResponse;
      try {
        parsedResponse = JSON.parse(rawText) as OpenAiCompatibleChatCompletionResponse;
      } catch (error) {
        throw new StructuredLlmError(
          `Structured LLM transport returned non-JSON output: ${error instanceof Error ? error.message : "Unknown parse error."}`,
        );
      }

      const content = readMessageContent(parsedResponse.choices?.[0]?.message?.content);
      const structuredOutput = parseStructuredJson(content);
      return request.prompt.outputSchema.parse(structuredOutput);
    },
  };
}

export function createPromptBackedNodes(adapter: StructuredLlmAdapter): Pick<
  AgentWorkflowNodes,
  "discoveryParse" | "retrieveProcedure" | "draftOptOut" | "interpretResult"
> {
  return {
    async discoveryParse(input: ListingPromptInput): Promise<DiscoveryResult> {
      return adapter.generateStructured({
        prompt: listingClassifierPrompt,
        input,
      });
    },

    async retrieveProcedure(input: ProcedurePromptInput): Promise<RetrieveProcedureOutput> {
      return adapter.generateStructured({
        prompt: procedureSelectorPrompt,
        input,
      });
    },

    async draftOptOut(input: DraftPromptInput): Promise<DraftOptOutOutput> {
      return adapter.generateStructured({
        prompt: draftGeneratorPrompt,
        input,
      });
    },

    async interpretResult(input: PostExecutionPromptInput): Promise<InterpretResultOutput> {
      return adapter.generateStructured({
        prompt: postExecutionVerifierPrompt,
        input,
      });
    },
  };
}

function buildQuery(input: ValidateConsentInput) {
  return [input.seed_profile.full_name, input.seed_profile.location.city, input.seed_profile.location.state].join(" ");
}

export function createDefaultConsentNode() {
  return function validateConsent(input: ValidateConsentInput, _context: GraphContext): ValidateConsentOutput {
    return {
      seed_profile: input.seed_profile,
      normalized_query: buildQuery(input),
      approved_for_submission: input.seed_profile.consent,
    };
  };
}

export function createFixtureLlmAdapter(
  fixtures: Partial<Record<PromptName, unknown | ((input: unknown) => unknown | Promise<unknown>)>>,
): StructuredLlmAdapter {
  return {
    async generateStructured<TInput, TOutput>({ prompt, input }: StructuredLlmRequest<TInput, TOutput>): Promise<TOutput> {
      const fixture = fixtures[prompt.name];
      if (!fixture) {
        throw new Error(`No fixture configured for prompt ${prompt.name}.`);
      }

      const result = typeof fixture === "function" ? await fixture(input) : fixture;
      return prompt.outputSchema.parse(result);
    },
  };
}
