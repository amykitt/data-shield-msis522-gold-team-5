import type { ReviewReason, WorkflowRunOutput } from "@/lib/agent";

export interface GoldenPathExpectation {
  minConfidence: number;
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
    procedureType: boolean;
    requiredFieldsPresent: boolean;
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

  const checks = {
    discoveryFound: output.discovery_parse.found,
    confidenceThreshold: Boolean(candidate && candidate.match_confidence >= expected.minConfidence),
    procedureType: output.retrieve_procedure?.procedure_type === expected.procedureType,
    requiredFieldsPresent: expected.requiredFieldNames.every((field) => webformFields.includes(field)),
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
