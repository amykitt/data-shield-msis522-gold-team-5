import { ZodError } from "zod";
import { describe, expect, it } from "vitest";

import {
  createStructuredLlmAdapterFromConfig,
  createStructuredLlmAdapterFromEnv,
  resolveAgentLlmConfig,
} from "@/lib/agent";
import { procedureSelectorPrompt } from "@/lib/agent/prompts";

describe("agent llm config", () => {
  it("resolves config from AGENT_LLM_* variables", () => {
    const config = resolveAgentLlmConfig({
      AGENT_LLM_PROVIDER: "openai_compatible",
      AGENT_LLM_BASE_URL: "https://llm.example.test/v1",
      AGENT_LLM_API_KEY: "secret-key",
      AGENT_LLM_MODEL: "gpt-4.1-mini",
      AGENT_LLM_ENDPOINT: "/chat/completions",
      AGENT_LLM_TEMPERATURE: "0.1",
    });

    expect(config.provider).toBe("openai_compatible");
    expect(config.baseUrl).toBe("https://llm.example.test/v1");
    expect(config.apiKey).toBe("secret-key");
    expect(config.model).toBe("gpt-4.1-mini");
    expect(config.temperature).toBe(0.1);
  });

  it("falls back to VITE_AGENT_LLM_* variables", () => {
    const config = resolveAgentLlmConfig({
      VITE_AGENT_LLM_BASE_URL: "https://llm.example.test/v1",
      VITE_AGENT_LLM_API_KEY: "vite-key",
      VITE_AGENT_LLM_MODEL: "gpt-4.1-mini",
    });

    expect(config.baseUrl).toBe("https://llm.example.test/v1");
    expect(config.apiKey).toBe("vite-key");
    expect(config.model).toBe("gpt-4.1-mini");
    expect(config.provider).toBe("openai_compatible");
    expect(config.endpoint).toBe("/chat/completions");
    expect(config.temperature).toBe(0);
  });

  it("rejects incomplete config", () => {
    expect(() =>
      resolveAgentLlmConfig({
        AGENT_LLM_BASE_URL: "https://llm.example.test/v1",
      }),
    ).toThrow(ZodError);
  });

  it("creates an adapter from env-backed config", async () => {
    let capturedAuthHeader = "";

    const adapter = createStructuredLlmAdapterFromEnv({
      env: {
        AGENT_LLM_BASE_URL: "https://llm.example.test/v1",
        AGENT_LLM_API_KEY: "secret-key",
        AGENT_LLM_MODEL: "gpt-4.1-mini",
      },
      headers: {
        "X-Agent-Run": "run-123",
      },
      transport: async (request) => {
        capturedAuthHeader = request.headers.Authorization ?? "";

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    site: "FastPeopleSearch",
                    procedure_type: "email",
                    required_fields: ["full_name", "privacy_email"],
                    steps: ["Email privacy@fastpeoplesearch.test"],
                    source_chunks: [
                      {
                        doc_id: "fps-1",
                        quote: "Email privacy@fastpeoplesearch.test for removals.",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        };
      },
    });

    const result = await adapter.generateStructured({
      prompt: procedureSelectorPrompt,
      input: {
        seed_profile: {
          full_name: "Jane Doe",
          name_variants: [],
          location: { city: "Seattle", state: "Washington" },
          approx_age: null,
          privacy_email: "shield-abc123@detraceme.io",
          optional: { phone_last4: null, prior_cities: [] },
          consent: true,
        },
        site: "FastPeopleSearch",
        discovery_result: {
          site: "FastPeopleSearch",
          scan_timestamp: "2026-03-12T12:00:00.000Z",
          found: true,
          candidates: [
            {
              url: "https://example.com/listing/jane-doe",
              extracted: {
                name: "Jane Doe",
                age: "35",
                addresses: [],
                relatives: [],
                phones: [],
              },
              match_confidence: 0.95,
              evidence_snippets: ["Jane Doe, Seattle, WA"],
            },
          ],
          notes: null,
        },
        retrieved_chunks: [{ doc_id: "fps-1", quote: "Email privacy@fastpeoplesearch.test for removals." }],
      },
    });

    expect(capturedAuthHeader).toBe("Bearer secret-key");
    expect(result.procedure_type).toBe("email");
  });

  it("creates an adapter directly from config", async () => {
    const adapter = createStructuredLlmAdapterFromConfig(
      {
        provider: "openai_compatible",
        baseUrl: "https://llm.example.test/v1",
        apiKey: "secret-key",
        model: "gpt-4.1-mini",
        endpoint: "/chat/completions",
        temperature: 0,
        headers: {},
      },
      {
        transport: async () => ({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    site: "FastPeopleSearch",
                    procedure_type: "email",
                    required_fields: ["full_name", "privacy_email"],
                    steps: ["Email privacy@fastpeoplesearch.test"],
                    source_chunks: [
                      {
                        doc_id: "fps-1",
                        quote: "Email privacy@fastpeoplesearch.test for removals.",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        }),
      },
    );

    const result = await adapter.generateStructured({
      prompt: procedureSelectorPrompt,
      input: {
        seed_profile: {
          full_name: "Jane Doe",
          name_variants: [],
          location: { city: "Seattle", state: "Washington" },
          approx_age: null,
          privacy_email: "shield-abc123@detraceme.io",
          optional: { phone_last4: null, prior_cities: [] },
          consent: true,
        },
        site: "FastPeopleSearch",
        discovery_result: {
          site: "FastPeopleSearch",
          scan_timestamp: "2026-03-12T12:00:00.000Z",
          found: true,
          candidates: [
            {
              url: "https://example.com/listing/jane-doe",
              extracted: {
                name: "Jane Doe",
                age: "35",
                addresses: [],
                relatives: [],
                phones: [],
              },
              match_confidence: 0.95,
              evidence_snippets: ["Jane Doe, Seattle, WA"],
            },
          ],
          notes: null,
        },
        retrieved_chunks: [{ doc_id: "fps-1", quote: "Email privacy@fastpeoplesearch.test for removals." }],
      },
    });

    expect(result.procedure_type).toBe("email");
  });
});
