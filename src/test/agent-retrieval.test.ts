import { describe, expect, it } from "vitest";

import {
  createDefaultProcedureRetriever,
  createDocumentProcedureRetriever,
  reviewReasonsForProcedureResolution,
} from "@/lib/agent";

describe("procedure retrieval integration", () => {
  const input = {
    seed_profile: {
      full_name: "Jane Doe",
      name_variants: [],
      location: { city: "Seattle", state: "Washington" },
      approx_age: null,
      privacy_email: "shield-abc123@detraceme.io",
      optional: { phone_last4: null, prior_cities: [] },
      consent: true as const,
    },
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
    site: "FastPeopleSearch",
    provided_chunks: [],
    registry_chunks: [],
  };

  const context = {
    run_id: "run_retrieval_001",
    policy: {
      match_confidence_threshold: 0.75,
      max_submission_retries: 1,
      require_explicit_consent: true,
      minimize_pii: true,
      require_retrieval_grounding: true,
    },
    review_reasons: [],
    events: [],
  };

  it("returns missing when no procedure chunks or documents are available", async () => {
    const retriever = createDocumentProcedureRetriever({
      documents: [],
      now: "2026-03-12T00:00:00.000Z",
    });

    const result = await retriever(input, context);

    expect(result.status).toBe("missing");
    expect(result.chunks).toEqual([]);
    expect(result.review_reasons).toEqual(["missing_procedure"]);
  });

  it("prefers provided chunks over document corpus results", async () => {
    const retriever = createDefaultProcedureRetriever();

    const result = await retriever(
      {
        ...input,
        provided_chunks: [{ doc_id: "fps-live-1", quote: "Use the webform and enter full name and email." }],
      },
      context,
    );

    expect(result.status).toBe("found");
    expect(result.chunks).toEqual([{ doc_id: "fps-live-1", quote: "Use the webform and enter full name and email." }]);
  });

  it("retrieves procedure chunks from the built-in document corpus", async () => {
    const retriever = createDefaultProcedureRetriever();

    const result = await retriever(input, context);

    expect(result.status).toBe("found");
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.notes).toContain("fastpeoplesearch-procedure-v1");
  });

  it("marks stale documents for review", async () => {
    const retriever = createDocumentProcedureRetriever({
      documents: [
        {
          id: "fps-old",
          site: "FastPeopleSearch",
          updated_at: "2025-01-01T00:00:00.000Z",
          channel_hint: "webform",
          chunks: [{ doc_id: "fps-old-1", quote: "Old webform procedure." }],
        },
      ],
      maxAgeDays: 30,
      now: "2026-03-12T00:00:00.000Z",
    });

    const result = await retriever(input, context);

    expect(result.status).toBe("stale");
    expect(result.review_reasons).toEqual(["stale_procedure"]);
  });

  it("marks contradictory documents for review", async () => {
    const retriever = createDocumentProcedureRetriever({
      documents: [
        {
          id: "fps-email",
          site: "FastPeopleSearch",
          updated_at: "2026-03-01T00:00:00.000Z",
          channel_hint: "email",
          chunks: [{ doc_id: "fps-email-1", quote: "Email privacy@site.test." }],
        },
        {
          id: "fps-webform",
          site: "FastPeopleSearch",
          updated_at: "2026-03-02T00:00:00.000Z",
          channel_hint: "webform",
          chunks: [{ doc_id: "fps-webform-1", quote: "Use the webform only." }],
        },
      ],
      now: "2026-03-12T00:00:00.000Z",
    });

    const result = await retriever(input, context);

    expect(result.status).toBe("contradictory");
    expect(result.review_reasons).toEqual(["contradictory_procedure"]);
    expect(result.chunks.length).toBe(2);
  });

  it("maps contradictory retrieval to an explicit review reason", () => {
    expect(reviewReasonsForProcedureResolution("contradictory")).toEqual(["contradictory_procedure"]);
  });
});
