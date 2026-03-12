import { describe, expect, it } from "vitest";

import { createAgentWorkflow } from "@/lib/agent";
import { fastPeopleSearchFixture } from "@/lib/agent/fixtures/fastpeoplesearch";
import {
  ambiguousFastPeopleSearchFixture,
  missingProcedureFastPeopleSearchFixture,
} from "@/lib/agent/fixtures/fastpeoplesearch-negative";

describe("artifact-backed one-site golden path", () => {
  it("runs FastPeopleSearch end-to-end using saved listing text and repo-backed procedure documents", async () => {
    const workflow = createAgentWorkflow();

    const result = await workflow.run({
      context: {
        run_id: "run_fixture_001",
        policy: {
          match_confidence_threshold: 0.75,
          max_submission_retries: 1,
          require_explicit_consent: true,
          minimize_pii: true,
          require_retrieval_grounding: true,
        },
        review_reasons: [],
        events: [],
      },
      seed_profile: fastPeopleSearchFixture.seedProfile,
      request_text: fastPeopleSearchFixture.requestText,
      site_input: {
        site: fastPeopleSearchFixture.site,
        page_text: fastPeopleSearchFixture.listingPageText,
        page_url: fastPeopleSearchFixture.candidateUrl,
        retrieved_chunks: [],
        execution_result: fastPeopleSearchFixture.executionResult,
      },
    });

    expect(result.discovery_parse.found).toBe(true);
    expect(result.discovery_parse.candidates[0]?.match_confidence).toBeGreaterThanOrEqual(
      fastPeopleSearchFixture.expected.minConfidence,
    );
    expect(result.retrieve_procedure?.procedure_type).toBe(fastPeopleSearchFixture.expected.procedureType);
    expect(result.retrieve_procedure?.source_chunks).toEqual(expect.arrayContaining(fastPeopleSearchFixture.procedureChunks));
    expect(result.draft_optout?.webform?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(fastPeopleSearchFixture.expected.requiredFieldNames),
    );
    expect(result.interpret_result?.next_status).toBe(fastPeopleSearchFixture.expected.nextStatus);
    expect(result.interpret_result?.next_action).toBe(fastPeopleSearchFixture.expected.nextAction);
  });

  it("blocks drafting and planning on an ambiguous saved listing", async () => {
    const workflow = createAgentWorkflow();

    const result = await workflow.run({
      context: {
        run_id: "run_fixture_ambiguous_001",
        policy: {
          match_confidence_threshold: 0.75,
          max_submission_retries: 1,
          require_explicit_consent: true,
          minimize_pii: true,
          require_retrieval_grounding: true,
        },
        review_reasons: [],
        events: [],
      },
      seed_profile: ambiguousFastPeopleSearchFixture.seedProfile,
      request_text: ambiguousFastPeopleSearchFixture.requestText,
      site_input: {
        site: ambiguousFastPeopleSearchFixture.site,
        page_text: ambiguousFastPeopleSearchFixture.listingPageText,
        page_url: ambiguousFastPeopleSearchFixture.candidateUrl,
        retrieved_chunks: [],
      },
    });

    expect(result.discovery_parse.found).toBe(true);
    expect(result.discovery_parse.candidates[0]?.match_confidence).toBeLessThan(0.75);
    expect(result.draft_optout).toBeNull();
    expect(result.plan_submission).toBeNull();
    expect(result.context.review_reasons).toContain("low_confidence_match");
  });

  it("blocks drafting and planning when no procedure document exists for the site", async () => {
    const workflow = createAgentWorkflow();

    const result = await workflow.run({
      context: {
        run_id: "run_fixture_missing_proc_001",
        policy: {
          match_confidence_threshold: 0.75,
          max_submission_retries: 1,
          require_explicit_consent: true,
          minimize_pii: true,
          require_retrieval_grounding: true,
        },
        review_reasons: [],
        events: [],
      },
      seed_profile: missingProcedureFastPeopleSearchFixture.seedProfile,
      request_text: missingProcedureFastPeopleSearchFixture.requestText,
      site_input: {
        site: "UnknownBroker",
        page_text: missingProcedureFastPeopleSearchFixture.listingPageText,
        page_url: missingProcedureFastPeopleSearchFixture.candidateUrl,
        retrieved_chunks: missingProcedureFastPeopleSearchFixture.procedureChunks,
      },
    });

    expect(result.discovery_parse.found).toBe(true);
    expect(result.retrieve_procedure?.procedure_type).toBe("procedure_unknown");
    expect(result.draft_optout).toBeNull();
    expect(result.plan_submission).toBeNull();
    expect(result.context.review_reasons).toEqual(
      expect.arrayContaining([...missingProcedureFastPeopleSearchFixture.expected.requiredReviewReasons]),
    );
  });
});
