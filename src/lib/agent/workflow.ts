import { z } from "zod";

import {
  discoveryResultSchema,
  executionResultSchema,
  procedureSourceChunkSchema,
  reviewReasonSchema,
  submissionPayloadSchema,
  type DiscoveryCandidate,
  type DiscoveryResult,
  type DraftOptOutInput,
  type DraftOptOutOutput,
  type ExecutionResult,
  type InterpretResultInput,
  type InterpretResultOutput,
  type PlanSubmissionInput,
  type PlanSubmissionOutput,
  type ProcedureRetrieval,
  type RetrieveProcedureInput,
  type RetrieveProcedureOutput,
  type SeedProfile,
  type ValidateConsentInput,
  type ValidateConsentOutput,
} from "@/lib/agent/contracts";
import { graphContextSchema, planSubmissionOutputSchema, type GraphContext } from "@/lib/agent/graph";
import {
  createDefaultProcedureRetriever,
  reviewReasonsForProcedureResolution,
  type ProcedureRetriever,
} from "@/lib/agent/retrieval";

const workflowSiteInputSchema = z.object({
  site: z.string().min(1),
  page_text: z.string().min(1),
  page_url: z.string().url(),
  retrieved_chunks: z.array(procedureSourceChunkSchema).default([]),
  execution_result: executionResultSchema.optional(),
});

export const workflowRunInputSchema = z.object({
  context: graphContextSchema,
  seed_profile: z.object({
    full_name: z.string().min(1),
    name_variants: z.array(z.string().min(1)).default([]),
    location: z.object({
      city: z.string().min(1),
      state: z.string().min(1),
    }),
    approx_age: z.string().nullable(),
    privacy_email: z.string().email(),
    optional: z.object({
      phone_last4: z.string().nullable().default(null),
      prior_cities: z.array(z.string().min(1)).default([]),
    }).default({ phone_last4: null, prior_cities: [] }),
    consent: z.literal(true),
  }),
  request_text: z.string().min(1),
  site_input: workflowSiteInputSchema,
});

export const workflowRunOutputSchema = z.object({
  context: graphContextSchema,
  validate_consent: z.object({
    seed_profile: workflowRunInputSchema.shape.seed_profile,
    normalized_query: z.string().min(1),
    approved_for_submission: z.boolean(),
  }),
  discovery_parse: discoveryResultSchema,
  retrieve_procedure: z.object({
    site: z.string().min(1),
    procedure_type: z.enum(["email", "webform", "procedure_unknown"]),
    required_fields: z.array(z.string().min(1)).default([]),
    steps: z.array(z.string().min(1)).default([]),
    source_chunks: z.array(procedureSourceChunkSchema).default([]),
  }).nullable(),
  draft_optout: submissionPayloadSchema.nullable(),
  plan_submission: planSubmissionOutputSchema.nullable(),
  interpret_result: z.object({
    next_status: z.enum(["submitted", "pending", "failed", "manual_required"]),
    next_action: z.enum(["none", "retry", "await_confirmation", "request_user_review"]),
    review_reasons: z.array(reviewReasonSchema).default([]),
  }).nullable(),
});

export const siteRegistryEntrySchema = z.object({
  site: z.string().min(1),
  enabled: z.boolean().default(true),
  notes: z.string().optional(),
  default_procedure_chunks: z.array(procedureSourceChunkSchema).default([]),
});

export type WorkflowSiteInput = z.infer<typeof workflowSiteInputSchema>;
export type WorkflowRunInput = z.infer<typeof workflowRunInputSchema>;
export type WorkflowRunOutput = z.infer<typeof workflowRunOutputSchema>;
export type SiteRegistryEntry = z.infer<typeof siteRegistryEntrySchema>;

export interface AgentWorkflowNodes {
  validateConsent: (input: ValidateConsentInput, context: GraphContext) => ValidateConsentOutput | Promise<ValidateConsentOutput>;
  discoveryParse: (input: { seed_profile: SeedProfile; site: string; page_text: string; page_url: string }, context: GraphContext) => DiscoveryResult | Promise<DiscoveryResult>;
  retrieveProcedure: (input: RetrieveProcedureInput, context: GraphContext) => RetrieveProcedureOutput | Promise<RetrieveProcedureOutput>;
  draftOptOut: (input: DraftOptOutInput, context: GraphContext) => DraftOptOutOutput | Promise<DraftOptOutOutput>;
  planSubmission: (input: PlanSubmissionInput, context: GraphContext) => PlanSubmissionOutput | Promise<PlanSubmissionOutput>;
  interpretResult: (input: InterpretResultInput, context: GraphContext) => InterpretResultOutput | Promise<InterpretResultOutput>;
}

export interface AgentWorkflowOptions {
  nodes?: Partial<AgentWorkflowNodes>;
  siteRegistry?: SiteRegistryEntry[];
  procedureRetriever?: ProcedureRetriever;
}

function toLower(value: string) {
  return value.toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function clipEvidence(text: string, needle: string) {
  const lowerText = toLower(text);
  const lowerNeedle = toLower(needle);
  const index = lowerText.indexOf(lowerNeedle);
  if (index === -1) {
    return text.slice(0, 140).trim();
  }

  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + needle.length + 60);
  return text.slice(start, end).trim();
}

function extractAge(pageText: string) {
  const match = pageText.match(/\bage\s*(\d{1,3})\b/i) ?? pageText.match(/\b(\d{1,3})\s*years?\s*old\b/i);
  return match?.[1] ?? null;
}

function extractPhones(pageText: string) {
  const matches = pageText.match(/(?:\(\d{3}\)\s*\d{3}-\d{4}|\b\d{3}-\d{3}-\d{4}\b)/g) ?? [];
  return unique(matches);
}

function extractAddresses(pageText: string) {
  const matches = pageText.match(/\b\d{1,5}\s+[A-Za-z0-9.'\- ]+\s(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive)\b[^\n,]*/g) ?? [];
  return unique(matches.map((value) => value.trim()));
}

function extractRelatives(pageText: string) {
  const relativeSection = pageText.match(/relatives?:\s*([^\n]+)/i)?.[1];
  if (!relativeSection) return [];
  return unique(relativeSection.split(/,|;/).map((value) => value.trim()).filter((value) => value.length > 1));
}

function buildQuery(seedProfile: SeedProfile) {
  return [seedProfile.full_name, seedProfile.location.city, seedProfile.location.state].join(" ");
}

function calculateConfidence(seedProfile: SeedProfile, pageText: string) {
  const lowerText = toLower(pageText);
  let score = 0;

  if (lowerText.includes(toLower(seedProfile.full_name))) score += 0.55;
  if (lowerText.includes(toLower(seedProfile.location.city))) score += 0.15;
  if (lowerText.includes(toLower(seedProfile.location.state))) score += 0.1;
  if (seedProfile.approx_age && lowerText.includes(seedProfile.approx_age)) score += 0.1;
  if (seedProfile.optional.phone_last4 && lowerText.includes(seedProfile.optional.phone_last4)) score += 0.1;
  if (seedProfile.optional.prior_cities.some((city) => lowerText.includes(toLower(city)))) score += 0.05;

  return Math.min(Number(score.toFixed(2)), 0.99);
}

function inferProcedureType(chunks: { doc_id: string; quote: string }[]) {
  const combined = toLower(chunks.map((chunk) => chunk.quote).join(" "));
  if (!combined) return "procedure_unknown" as const;
  if (combined.includes("email") && /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(combined)) return "email" as const;
  if (combined.includes("webform") || combined.includes("form") || combined.includes("checkbox")) return "webform" as const;
  return "procedure_unknown" as const;
}

function inferRequiredFields(chunks: { doc_id: string; quote: string }[]) {
  const combined = toLower(chunks.map((chunk) => chunk.quote).join(" "));
  return unique(
    [
      combined.includes("name") ? "full_name" : "",
      combined.includes("email") ? "privacy_email" : "",
      combined.includes("address") ? "address" : "",
      combined.includes("age") ? "approx_age" : "",
    ].filter(Boolean),
  );
}

function inferSteps(chunks: { doc_id: string; quote: string }[]) {
  return unique(chunks.map((chunk) => chunk.quote.trim()).filter(Boolean));
}

function makeFieldValue(seedProfile: SeedProfile, field: string) {
  switch (field) {
    case "full_name":
      return seedProfile.full_name;
    case "privacy_email":
      return seedProfile.privacy_email;
    case "approx_age":
      return seedProfile.approx_age ?? "";
    case "address":
      return `${seedProfile.location.city}, ${seedProfile.location.state}`;
    default:
      return "";
  }
}

function createDefaultNodes(): AgentWorkflowNodes {
  return {
    validateConsent(input) {
      return {
        seed_profile: input.seed_profile,
        normalized_query: buildQuery(input.seed_profile),
        approved_for_submission: input.seed_profile.consent,
      };
    },

    discoveryParse(input) {
      const variants = unique([input.seed_profile.full_name, ...input.seed_profile.name_variants]);
      const matchedVariant = variants.find((variant) => toLower(input.page_text).includes(toLower(variant)));
      const found = Boolean(matchedVariant);
      const age = extractAge(input.page_text);
      const candidate: DiscoveryCandidate | null = found
        ? {
            url: input.page_url,
            extracted: {
              name: matchedVariant ?? input.seed_profile.full_name,
              age,
              addresses: extractAddresses(input.page_text),
              relatives: extractRelatives(input.page_text),
              phones: extractPhones(input.page_text),
            },
            match_confidence: calculateConfidence(input.seed_profile, input.page_text),
            evidence_snippets: [clipEvidence(input.page_text, matchedVariant ?? input.seed_profile.full_name)],
          }
        : null;

      return {
        site: input.site,
        scan_timestamp: new Date().toISOString(),
        found,
        candidates: candidate ? [candidate] : [],
        notes: found ? null : "No likely match found in extracted page text.",
      };
    },

    retrieveProcedure(input) {
      const procedureType = inferProcedureType(input.retrieved_chunks);
      if (procedureType === "procedure_unknown") {
        return {
          site: input.site,
          procedure_type: "procedure_unknown",
          required_fields: [],
          steps: [],
          source_chunks: [],
        };
      }

      return {
        site: input.site,
        procedure_type: procedureType,
        required_fields: inferRequiredFields(input.retrieved_chunks),
        steps: inferSteps(input.retrieved_chunks),
        source_chunks: input.retrieved_chunks,
      };
    },

    draftOptOut(input) {
      const { seed_profile, candidate_url, procedure, site } = input;

      if (procedure.procedure_type === "email") {
        const destination = procedure.source_chunks
          .map((chunk) => chunk.quote.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0])
          .find(Boolean) ?? "privacy@example.com";

        return {
          site,
          candidate_url,
          procedure_type: "email",
          email: {
            to: destination,
            subject: `${site} removal request for ${seed_profile.full_name}`,
            body: [
              `Please remove the listing associated with ${seed_profile.full_name}.`,
              `Privacy email: ${seed_profile.privacy_email}`,
              `Location: ${seed_profile.location.city}, ${seed_profile.location.state}`,
            ].join("\n"),
          },
        };
      }

      return {
        site,
        candidate_url,
        procedure_type: "webform",
        webform: {
          fields: procedure.required_fields.map((field) => ({
            name: field,
            value: makeFieldValue(seed_profile, field),
          })).filter((field) => field.value),
          consent_checkboxes: procedure.steps.filter((step) => /checkbox|consent|agree/i.test(step)),
        },
      };
    },

    planSubmission(input, context) {
      const topCandidate = input.discovery_result.candidates[0];
      const reviewReasons = [...context.review_reasons];

      if (input.procedure.procedure_type === "procedure_unknown") {
        reviewReasons.push("procedure_unknown");
      }
      if (!topCandidate || topCandidate.match_confidence < context.policy.match_confidence_threshold) {
        reviewReasons.push("low_confidence_match");
      }

      return {
        action_plan: input.submission_payload,
        requires_manual_review: reviewReasons.length > 0,
        review_reasons: unique(reviewReasons),
      };
    },

    interpretResult(input, context) {
      const reviewReasons = [...context.review_reasons, ...input.prior_review_reasons];

      switch (input.execution_result.status) {
        case "manual_required":
          return {
            next_status: "manual_required",
            next_action: "request_user_review",
            review_reasons: unique(reviewReasons.length > 0 ? reviewReasons : ["manual_submission_required"]),
          };
        case "pending":
          return {
            next_status: "pending",
            next_action: "await_confirmation",
            review_reasons: unique(reviewReasons),
          };
        case "failed":
          return {
            next_status: "failed",
            next_action: reviewReasons.includes("captcha") ? "request_user_review" : "retry",
            review_reasons: unique(reviewReasons),
          };
        default:
          return {
            next_status: "submitted",
            next_action: "none",
            review_reasons: unique(reviewReasons),
          };
      }
    },
  };
}

export function createAgentWorkflow(options: AgentWorkflowOptions = {}) {
  const defaultNodes = createDefaultNodes();
  const nodes: AgentWorkflowNodes = {
    ...defaultNodes,
    ...options.nodes,
  };
  const registry = options.siteRegistry ?? [];
  const procedureRetriever = options.procedureRetriever ?? createDefaultProcedureRetriever();

  return {
    registry,
    async run(input: WorkflowRunInput): Promise<WorkflowRunOutput> {
      const parsedInput = workflowRunInputSchema.parse(input);
      const registryEntry = registry.find((entry) => entry.site === parsedInput.site_input.site);
      const context: GraphContext = {
        ...parsedInput.context,
        review_reasons: [...parsedInput.context.review_reasons],
        events: [...parsedInput.context.events],
      };

      const validateConsent = await nodes.validateConsent(
        {
          seed_profile: parsedInput.seed_profile,
          request_text: parsedInput.request_text,
        },
        context,
      );

      const discoveryParse = await nodes.discoveryParse(
        {
          seed_profile: parsedInput.seed_profile,
          site: parsedInput.site_input.site,
          page_text: parsedInput.site_input.page_text,
          page_url: parsedInput.site_input.page_url,
        },
        context,
      );

      let retrieveProcedure: ProcedureRetrieval | null = null;
      let draftOptOut: DraftOptOutOutput | null = null;
      let planSubmission: PlanSubmissionOutput | null = null;
      let interpretResult: InterpretResultOutput | null = null;

      const topCandidate = discoveryParse.candidates[0];
      const confidenceBelowThreshold = !topCandidate || topCandidate.match_confidence < context.policy.match_confidence_threshold;
      if (confidenceBelowThreshold) {
        context.review_reasons = unique([...context.review_reasons, "low_confidence_match"]);
      }

      if (discoveryParse.found && topCandidate && !confidenceBelowThreshold) {
        const procedureResolution = await procedureRetriever(
          {
            seed_profile: parsedInput.seed_profile,
            discovery_result: discoveryParse,
            site: parsedInput.site_input.site,
            provided_chunks: parsedInput.site_input.retrieved_chunks,
            registry_chunks: registryEntry?.default_procedure_chunks ?? [],
          },
          context,
        );

        if (procedureResolution.review_reasons.length > 0) {
          context.review_reasons = unique([...context.review_reasons, ...procedureResolution.review_reasons]);
        } else if (procedureResolution.status !== "found") {
          context.review_reasons = unique([
            ...context.review_reasons,
            ...reviewReasonsForProcedureResolution(procedureResolution.status),
          ]);
        }

        retrieveProcedure = await nodes.retrieveProcedure(
          {
            seed_profile: parsedInput.seed_profile,
            discovery_result: discoveryParse,
            site: parsedInput.site_input.site,
            retrieved_chunks: procedureResolution.status === "found" ? procedureResolution.chunks : [],
          },
          context,
        );

        if (retrieveProcedure.procedure_type === "procedure_unknown") {
          context.review_reasons = unique([...context.review_reasons, "procedure_unknown"]);
        } else if (validateConsent.approved_for_submission && procedureResolution.status === "found") {
          draftOptOut = await nodes.draftOptOut(
            {
              seed_profile: parsedInput.seed_profile,
              site: parsedInput.site_input.site,
              candidate_url: topCandidate.url,
              procedure: retrieveProcedure,
            },
            context,
          );

          planSubmission = await nodes.planSubmission(
            {
              seed_profile: parsedInput.seed_profile,
              discovery_result: discoveryParse,
              procedure: retrieveProcedure,
              submission_payload: draftOptOut,
            },
            context,
          );

          if (planSubmission.review_reasons.length > 0) {
            context.review_reasons = unique([...context.review_reasons, ...planSubmission.review_reasons]);
          }
        }
      }

      if (parsedInput.site_input.execution_result) {
        interpretResult = await nodes.interpretResult(
          {
            execution_result: parsedInput.site_input.execution_result as ExecutionResult,
            prior_review_reasons: context.review_reasons,
          },
          context,
        );
      }

      return workflowRunOutputSchema.parse({
        context,
        validate_consent: validateConsent,
        discovery_parse: discoveryParse,
        retrieve_procedure: retrieveProcedure,
        draft_optout: draftOptOut,
        plan_submission: planSubmission,
        interpret_result: interpretResult,
      });
    },
  };
}

