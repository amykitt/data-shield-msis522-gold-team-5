import { describe, expect, it } from "vitest";

import {
  draftGeneratorPrompt,
  listingClassifierPrompt,
  postExecutionVerifierPrompt,
  procedureSelectorPrompt,
} from "@/lib/agent/prompts";

describe("agent prompt definitions", () => {
  it("builds a conservative listing classifier prompt", () => {
    const prompt = listingClassifierPrompt.buildUserPrompt({
      seed_profile: {
        full_name: "Jane Doe",
        name_variants: ["J. Doe"],
        location: { city: "Seattle", state: "Washington" },
        approx_age: "35",
        privacy_email: "shield-abc123@detraceme.io",
        optional: { phone_last4: null, prior_cities: [] },
        consent: true,
      },
      site: "FastPeopleSearch",
      page_text: "Jane Doe, age 35, Seattle, WA",
      page_url: "https://example.com/listing/jane-doe",
    });

    expect(listingClassifierPrompt.system).toContain("strict JSON only");
    expect(listingClassifierPrompt.system).toContain("evidence_snippets");
    expect(prompt).toContain("Seed profile");
    expect(prompt).toContain("Page text");
  });

  it("grounds procedure selection in retrieved chunks", () => {
    const prompt = procedureSelectorPrompt.buildUserPrompt({
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
            match_confidence: 0.93,
            evidence_snippets: ["Jane Doe, Seattle, WA"],
          },
        ],
        notes: null,
      },
      retrieved_chunks: [{ doc_id: "fps-1", quote: "Use the removal form." }],
    });

    expect(procedureSelectorPrompt.system).toContain("Do not invent steps");
    expect(prompt).toContain("Retrieved chunks");
  });

  it("enforces PII minimization in draft generation and caution in post execution verification", () => {
    expect(draftGeneratorPrompt.system).toContain("Minimize PII");
    expect(postExecutionVerifierPrompt.system).toContain("If a CAPTCHA appears");
    expect(postExecutionVerifierPrompt.system).toContain("Do not overstate success");
  });
});
