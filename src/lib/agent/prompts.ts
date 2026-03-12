import { z } from "zod";

import {
  discoveryResultSchema,
  executionResultSchema,
  interpretResultOutputSchema,
  procedureRetrievalSchema,
  seedProfileSchema,
  submissionPayloadSchema,
} from "@/lib/agent";

export type PromptName =
  | "listing_classifier_extractor"
  | "procedure_selector"
  | "draft_generator"
  | "post_execution_verifier";

export interface PromptDefinition<TInput, TOutput> {
  name: PromptName;
  system: string;
  buildUserPrompt: (input: TInput) => string;
  outputSchema: z.ZodType<TOutput>;
}

export const listingPromptInputSchema = z.object({
  seed_profile: seedProfileSchema,
  site: z.string().min(1),
  page_text: z.string().min(1),
  page_url: z.string().url().optional(),
});

export const procedurePromptInputSchema = z.object({
  seed_profile: seedProfileSchema,
  site: z.string().min(1),
  discovery_result: discoveryResultSchema,
  retrieved_chunks: z.array(z.object({
    doc_id: z.string().min(1),
    quote: z.string().min(1),
  })).default([]),
});

export const draftPromptInputSchema = z.object({
  seed_profile: seedProfileSchema,
  site: z.string().min(1),
  candidate_url: z.string().url(),
  procedure: procedureRetrievalSchema,
});

export const postExecutionPromptInputSchema = z.object({
  execution_result: executionResultSchema,
  prior_review_reasons: z.array(z.string().min(1)).default([]),
});

export type ListingPromptInput = z.infer<typeof listingPromptInputSchema>;
export type ProcedurePromptInput = z.infer<typeof procedurePromptInputSchema>;
export type DraftPromptInput = z.infer<typeof draftPromptInputSchema>;
export type PostExecutionPromptInput = z.infer<typeof postExecutionPromptInputSchema>;

export const listingClassifierPrompt: PromptDefinition<ListingPromptInput, z.infer<typeof discoveryResultSchema>> = {
  name: "listing_classifier_extractor",
  system: [
    "You classify people-search listings and extract structured data.",
    "Return strict JSON only.",
    "Be conservative with match_confidence when identity is ambiguous.",
    "Always include evidence_snippets drawn from the provided page text.",
    "Do not invent fields that are not supported by the page text.",
  ].join(" "),
  buildUserPrompt(input) {
    return [
      `Site: ${input.site}`,
      `Seed profile: ${JSON.stringify(input.seed_profile)}`,
      input.page_url ? `Page URL: ${input.page_url}` : "",
      "Task: Determine whether the page contains a likely listing for the seed profile and extract structured candidate data.",
      "Output schema: DiscoveryResult",
      "Page text:",
      input.page_text,
    ].filter(Boolean).join("\n\n");
  },
  outputSchema: discoveryResultSchema,
};

export const procedureSelectorPrompt: PromptDefinition<ProcedurePromptInput, z.infer<typeof procedureRetrievalSchema>> = {
  name: "procedure_selector",
  system: [
    "You select opt-out procedures using only retrieved procedure chunks.",
    "Return strict JSON only.",
    "Cite retrieved chunks in source_chunks.",
    "If chunks are missing, contradictory, or insufficient, return procedure_unknown.",
    "Do not invent steps, fields, or contact methods.",
  ].join(" "),
  buildUserPrompt(input) {
    return [
      `Site: ${input.site}`,
      `Seed profile: ${JSON.stringify(input.seed_profile)}`,
      `Discovery result: ${JSON.stringify(input.discovery_result)}`,
      `Retrieved chunks: ${JSON.stringify(input.retrieved_chunks)}`,
      "Task: Choose the correct opt-out path and list required fields and steps.",
      "Output schema: ProcedureRetrieval",
    ].join("\n\n");
  },
  outputSchema: procedureRetrievalSchema,
};

export const draftGeneratorPrompt: PromptDefinition<DraftPromptInput, z.infer<typeof submissionPayloadSchema>> = {
  name: "draft_generator",
  system: [
    "You generate site-specific opt-out payloads grounded in the provided procedure.",
    "Return strict JSON only.",
    "Never invent new steps or fields beyond the procedure.",
    "Minimize PII and use only the privacy-safe email alias.",
    "Do not expose unnecessary personal details.",
  ].join(" "),
  buildUserPrompt(input) {
    return [
      `Site: ${input.site}`,
      `Seed profile: ${JSON.stringify(input.seed_profile)}`,
      `Candidate URL: ${input.candidate_url}`,
      `Procedure: ${JSON.stringify(input.procedure)}`,
      "Task: Produce either an email payload or a webform payload that matches the procedure requirements.",
      "Output schema: SubmissionPayload",
    ].join("\n\n");
  },
  outputSchema: submissionPayloadSchema,
};

export const postExecutionVerifierPrompt: PromptDefinition<PostExecutionPromptInput, z.infer<typeof interpretResultOutputSchema>> = {
  name: "post_execution_verifier",
  system: [
    "You interpret automation results for privacy removals.",
    "Return strict JSON only.",
    "If a CAPTCHA appears, return manual_required and request_user_review.",
    "If confirmation is unclear, prefer pending with evidence-aware caution.",
    "Do not overstate success.",
  ].join(" "),
  buildUserPrompt(input) {
    return [
      `Execution result: ${JSON.stringify(input.execution_result)}`,
      `Prior review reasons: ${JSON.stringify(input.prior_review_reasons)}`,
      "Task: Determine the next status and next action after automation execution.",
      "Output schema: InterpretResultOutput",
    ].join("\n\n");
  },
  outputSchema: interpretResultOutputSchema,
};

export const promptRegistry = {
  listing_classifier_extractor: listingClassifierPrompt,
  procedure_selector: procedureSelectorPrompt,
  draft_generator: draftGeneratorPrompt,
  post_execution_verifier: postExecutionVerifierPrompt,
} as const;
