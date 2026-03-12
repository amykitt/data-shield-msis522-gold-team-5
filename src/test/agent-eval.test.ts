import { describe, expect, it } from "vitest";

import { createAgentWorkflow } from "@/lib/agent";
import { evaluateGoldenPath, evaluateReviewFallback } from "@/lib/agent/eval";
import { fastPeopleSearchFixture } from "@/lib/agent/fixtures/fastpeoplesearch";
import {
  ambiguousFastPeopleSearchFixture,
  missingProcedureFastPeopleSearchFixture,
} from "@/lib/agent/fixtures/fastpeoplesearch-negative";

describe("agent evaluation harness", () => {
  it("evaluates the FastPeopleSearch fixture against expected workflow outputs", async () => {
    const workflow = createAgentWorkflow();

    const result = await workflow.run({
      context: {
        run_id: "run_eval_001",
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

    const evaluation = evaluateGoldenPath(result, fastPeopleSearchFixture.expected);

    expect(evaluation.passed).toBe(true);
    expect(evaluation.checks.discoveryFound).toBe(true);
    expect(evaluation.checks.requiredFieldsPresent).toBe(true);
    expect(evaluation.checks.noManualReview).toBe(true);
  });

  it("evaluates an ambiguous listing fixture as a review fallback", async () => {
    const workflow = createAgentWorkflow();

    const result = await workflow.run({
      context: {
        run_id: "run_eval_ambiguous_001",
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

    const evaluation = evaluateReviewFallback(result, {
      maxConfidence: ambiguousFastPeopleSearchFixture.expected.maxConfidence,
      requiredReviewReasons: [ambiguousFastPeopleSearchFixture.expected.requiredReviewReason],
      draftBlocked: true,
      submissionBlocked: true,
    });

    expect(evaluation.passed).toBe(true);
  });

  it("evaluates a missing-procedure fixture as a review fallback", async () => {
    const workflow = createAgentWorkflow();

    const result = await workflow.run({
      context: {
        run_id: "run_eval_missing_proc_001",
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

    const evaluation = evaluateReviewFallback(result, {
      maxConfidence: undefined,
      requiredReviewReasons: [...missingProcedureFastPeopleSearchFixture.expected.requiredReviewReasons],
      draftBlocked: true,
      submissionBlocked: true,
    });

    expect(evaluation.passed).toBe(true);
  });
});
