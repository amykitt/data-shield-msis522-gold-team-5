import type { ExecutionResult, ProcedureSourceChunk, SeedProfile } from "@/lib/agent";

const sharedSeedProfile: SeedProfile = {
  full_name: "Jane Doe",
  name_variants: ["Jane A Doe", "J. Doe"],
  location: {
    city: "Seattle",
    state: "Washington",
  },
  approx_age: "35",
  privacy_email: "shield-abc123@detraceme.io",
  optional: {
    phone_last4: "0114",
    prior_cities: ["Tacoma"],
  },
  consent: true,
};

const sharedExecutionResult: ExecutionResult = {
  site: "FastPeopleSearch",
  candidate_url: "https://fastpeoplesearch.test/listing/possible-jane-doe",
  status: "manual_required",
  confirmation: {
    ticket: null,
    page_text: "Manual review required.",
    screenshot_ref: null,
  },
  error: null,
};

export const ambiguousFastPeopleSearchFixture = {
  site: "FastPeopleSearch",
  requestText: "Search for my name + Seattle and submit removals for everything you find.",
  seedProfile: sharedSeedProfile,
  listingPageText: `
  Jane Doe
  Spokane, Washington
  Age 42
  Phone: 425-555-9988
  Relatives: Mark Doe
  `,
  candidateUrl: "https://fastpeoplesearch.test/listing/possible-jane-doe",
  procedureChunks: [
    {
      doc_id: "fps-proc-1",
      quote: "Use the FastPeopleSearch removal webform to request record suppression.",
    },
  ] satisfies ProcedureSourceChunk[],
  executionResult: sharedExecutionResult,
  expected: {
    maxConfidence: 0.74,
    requiredReviewReason: "low_confidence_match" as const,
  },
};

export const missingProcedureFastPeopleSearchFixture = {
  site: "FastPeopleSearch",
  requestText: "Search for my name + Seattle and submit removals for everything you find.",
  seedProfile: sharedSeedProfile,
  listingPageText: `
  Jane Doe, Age 35
  Seattle, Washington
  Current Address: 123 Pine St Seattle WA
  Phone: 206-555-0114
  `,
  candidateUrl: "https://fastpeoplesearch.test/listing/jane-doe-seattle-wa",
  procedureChunks: [] as ProcedureSourceChunk[],
  executionResult: sharedExecutionResult,
  expected: {
    minConfidence: 0.75,
    requiredReviewReasons: ["missing_procedure", "procedure_unknown"] as const,
  },
};
