import type { ReviewReason, WorkflowRunOutput } from "@/lib/agent";

export interface GoldenPathExpectation {
  minConfidence: number;
  decision: "exact_match" | "likely_match";
  procedureType: "email" | "webform";
  requiredFieldNames: string[];
  nextStatus: "submitted" | "pending" | "failed" | "manual_required";
  nextAction: "none" | "retry" | "await_confirmation" | "request_user_review";
}

export interface GoldenPathEvaluation {
  passed: boolean;
  checks: {
    discoveryFound: boolean;
    confidenceThreshold: boolean;
    matchDecision: boolean;
    groundedProcedure: boolean;
    procedureType: boolean;
    requiredFieldsPresent: boolean;
    cleanSubmissionPayload: boolean;
    nextStatus: boolean;
    nextAction: boolean;
    noManualReview: boolean;
  };
}

export interface ReviewFallbackExpectation {
  maxConfidence?: number;
  requiredReviewReasons: ReviewReason[];
  draftBlocked: boolean;
  submissionBlocked: boolean;
}

export interface ReviewFallbackEvaluation {
  passed: boolean;
  checks: {
    confidenceBelowThreshold: boolean;
    requiredReasonsPresent: boolean;
    draftBlocked: boolean;
    submissionBlocked: boolean;
  };
}

export function evaluateGoldenPath(output: WorkflowRunOutput, expected: GoldenPathExpectation): GoldenPathEvaluation {
  const candidate = output.discovery_parse.candidates[0];
  const webformFields = output.draft_optout?.webform?.fields.map((field) => field.name) ?? [];
  const fieldEntries = output.draft_optout?.webform?.fields ?? [];
  const uniqueFieldNames = new Set(fieldEntries.map((field) => field.name));
  const cleanSubmissionPayload = output.draft_optout?.procedure_type === "webform"
    ? output.draft_optout.email === undefined
      && fieldEntries.length > 0
      && fieldEntries.every((field) => field.name.trim().length > 0 && field.value.trim().length > 0)
      && uniqueFieldNames.size === fieldEntries.length
    : output.draft_optout?.procedure_type === "email"
      ? output.draft_optout.webform === undefined
      : false;

  const checks = {
    discoveryFound: output.discovery_parse.found,
    confidenceThreshold: Boolean(candidate && candidate.match_confidence >= expected.minConfidence),
    matchDecision: output.match_decision?.decision === expected.decision
      && output.match_decision?.confidence === candidate?.match_confidence
      && (output.match_decision?.evidence.length ?? 0) > 0,
    groundedProcedure:
      output.retrieve_procedure?.procedure_type === expected.procedureType
      && (output.retrieve_procedure?.source_chunks.length ?? 0) > 0,
    procedureType: output.retrieve_procedure?.procedure_type === expected.procedureType,
    requiredFieldsPresent: expected.requiredFieldNames.every((field) => webformFields.includes(field)),
    cleanSubmissionPayload,
    nextStatus: output.interpret_result?.next_status === expected.nextStatus,
    nextAction: output.interpret_result?.next_action === expected.nextAction,
    noManualReview: output.plan_submission?.requires_manual_review === false,
  };

  return {
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}

export function evaluateReviewFallback(
  output: WorkflowRunOutput,
  expected: ReviewFallbackExpectation,
): ReviewFallbackEvaluation {
  const candidate = output.discovery_parse.candidates[0];
  const checks = {
    confidenceBelowThreshold:
      expected.maxConfidence === undefined ? true : Boolean(candidate && candidate.match_confidence <= expected.maxConfidence),
    requiredReasonsPresent: expected.requiredReviewReasons.every((reason) => output.context.review_reasons.includes(reason)),
    draftBlocked: expected.draftBlocked ? output.draft_optout === null : output.draft_optout !== null,
    submissionBlocked: expected.submissionBlocked ? output.plan_submission === null : output.plan_submission !== null,
  };

  return {
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}
