import { describe, expect, it, vi } from "vitest";

import {
  agentApiPaths,
  createRunRequestSchema,
  createRunResponseSchema,
  sendChatCommandRequestSchema,
  startAgentRunRequestSchema,
} from "@/lib/agent/api";
import { AgentApiError, createAgentApiClient } from "@/lib/agent/client";
import { mockAgentRunState } from "@/lib/agent/mock-run";

describe("agent api transport schemas", () => {
  it("accepts a create-run payload aligned with the shared contracts", () => {
    const payload = createRunRequestSchema.safeParse({
      profile: mockAgentRunState.profile,
      intent: mockAgentRunState.intent,
    });

    expect(payload.success).toBe(true);
  });

  it("accepts a spec-aligned start-run payload with seed profile input", () => {
    const payload = startAgentRunRequestSchema.safeParse({
      seed_profile: {
        full_name: "Jane Doe",
        name_variants: ["J. Doe"],
        location: {
          city: "Seattle",
          state: "Washington",
        },
        approx_age: "35",
        privacy_email: "shield-abc123@detraceme.io",
        optional: {
          phone_last4: null,
          prior_cities: ["Tacoma"],
        },
        consent: true,
      },
      request_text: "Search for my name + Seattle and submit removals for everything you find.",
      requested_sites: ["fastpeoplesearch"],
    });

    expect(payload.success).toBe(true);
  });

  it("accepts a create-run response payload", () => {
    const payload = createRunResponseSchema.safeParse({ run: mockAgentRunState });

    expect(payload.success).toBe(true);
  });

  it("rejects empty chat commands", () => {
    const payload = sendChatCommandRequestSchema.safeParse({ message: "" });

    expect(payload.success).toBe(false);
  });
});

describe("agent api client", () => {
  it("posts validated payloads to the expected endpoint", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ run: mockAgentRunState })),
    });

    const client = createAgentApiClient({ baseUrl: "https://example.test", fetchFn: fetchFn as typeof fetch });
    const response = await client.createRun({
      profile: mockAgentRunState.profile,
      intent: mockAgentRunState.intent,
    });

    expect(fetchFn).toHaveBeenCalledWith(
      `https://example.test${agentApiPaths.runs}`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(response.run.runId).toBe(mockAgentRunState.runId);
  });

  it("throws a typed error for non-2xx responses", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: () => Promise.resolve(JSON.stringify({ code: "conflict", message: "Run already exists." })),
    });

    const client = createAgentApiClient({ fetchFn: fetchFn as typeof fetch });

    await expect(client.getRun("run_missing")).rejects.toBeInstanceOf(AgentApiError);
  });
});