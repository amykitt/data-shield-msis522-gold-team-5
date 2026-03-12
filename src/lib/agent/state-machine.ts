import { z } from "zod";

import {
  agentRunPhaseSchema,
  agentRunStatusSchema,
  reviewReasonSchema,
  type AgentRunPhase,
} from "@/lib/agent/contracts";

export const phaseTransitionSchema = z.object({
  from: agentRunPhaseSchema,
  to: agentRunPhaseSchema,
  allowedStatuses: z.array(agentRunStatusSchema).min(1),
  notes: z.string().min(1),
  mayRequireReview: z.array(reviewReasonSchema).default([]),
});

export const phaseTransitionMap = {
  intake: ["scan"],
  scan: ["match", "completed"],
  match: ["retrieve_procedure", "completed"],
  retrieve_procedure: ["draft", "approval"],
  draft: ["approval"],
  approval: ["execution", "completed"],
  execution: ["verification", "approval"],
  verification: ["logging", "approval"],
  logging: ["completed"],
  completed: [],
} satisfies Record<AgentRunPhase, AgentRunPhase[]>;

export const phaseTransitions = [
  {
    from: "intake",
    to: "scan",
    allowedStatuses: ["in_progress"],
    notes: "User intent and profile have been accepted for scanning.",
  },
  {
    from: "scan",
    to: "match",
    allowedStatuses: ["in_progress"],
    notes: "Candidate listings were discovered and can be evaluated.",
  },
  {
    from: "scan",
    to: "completed",
    allowedStatuses: ["completed"],
    notes: "Scanning finished with no actionable matches.",
  },
  {
    from: "match",
    to: "retrieve_procedure",
    allowedStatuses: ["in_progress"],
    notes: "At least one candidate met the confidence threshold for procedure retrieval.",
    mayRequireReview: ["ambiguous_match", "low_confidence_match"],
  },
  {
    from: "match",
    to: "completed",
    allowedStatuses: ["completed"],
    notes: "No candidates qualified for action after matching.",
  },
  {
    from: "retrieve_procedure",
    to: "draft",
    allowedStatuses: ["in_progress"],
    notes: "A complete procedure was retrieved and can be used for drafting.",
  },
  {
    from: "retrieve_procedure",
    to: "approval",
    allowedStatuses: ["awaiting_user", "blocked"],
    notes: "Procedure retrieval is incomplete or requires manual confirmation before drafting continues.",
    mayRequireReview: ["missing_procedure", "stale_procedure", "contradictory_procedure", "manual_submission_required"],
  },
  {
    from: "draft",
    to: "approval",
    allowedStatuses: ["awaiting_user", "in_progress"],
    notes: "Drafts are ready for a consent or quality gate.",
    mayRequireReview: ["missing_required_input"],
  },
  {
    from: "approval",
    to: "execution",
    allowedStatuses: ["in_progress"],
    notes: "All approvals and inputs required for execution are present.",
  },
  {
    from: "approval",
    to: "completed",
    allowedStatuses: ["canceled"],
    notes: "The user declined to proceed after review.",
  },
  {
    from: "execution",
    to: "verification",
    allowedStatuses: ["in_progress"],
    notes: "Automation submitted or attempted the opt-out request.",
    mayRequireReview: ["captcha", "email_confirmation_required", "rate_limited", "site_unreachable"],
  },
  {
    from: "execution",
    to: "approval",
    allowedStatuses: ["awaiting_user", "blocked"],
    notes: "Execution surfaced an issue that requires human follow-up.",
    mayRequireReview: ["captcha", "email_confirmation_required", "manual_submission_required"],
  },
  {
    from: "verification",
    to: "logging",
    allowedStatuses: ["in_progress"],
    notes: "Execution outcomes have enough evidence to be recorded.",
  },
  {
    from: "verification",
    to: "approval",
    allowedStatuses: ["awaiting_user"],
    notes: "Verification requires additional user action before completion.",
    mayRequireReview: ["email_confirmation_required"],
  },
  {
    from: "logging",
    to: "completed",
    allowedStatuses: ["completed"],
    notes: "All actions and evidence have been recorded.",
  },
] satisfies z.infer<typeof phaseTransitionSchema>[];

export function canTransitionPhase(from: AgentRunPhase, to: AgentRunPhase) {
  return phaseTransitionMap[from].includes(to);
}

