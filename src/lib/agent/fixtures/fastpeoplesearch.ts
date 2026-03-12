import type { DiscoveryResult, ExecutionResult, ProcedureSourceChunk, SeedProfile } from "@/lib/agent";

export const fastPeopleSearchSeedProfile: SeedProfile = {
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

export const fastPeopleSearchListingPageText = `
Jane Doe, Age 35
Seattle, Washington
Current Address: 123 Pine St Seattle WA
Previous City: Tacoma WA
Phone: 206-555-0114
Relatives: John Doe, Mary Doe
`;

export const fastPeopleSearchCandidateUrl = "https://fastpeoplesearch.test/listing/jane-doe-seattle-wa";

export const fastPeopleSearchProcedureChunks: ProcedureSourceChunk[] = [
  {
    doc_id: "fps-proc-1",
    quote: "Use the FastPeopleSearch removal webform to request record suppression.",
  },
  {
    doc_id: "fps-proc-2",
    quote: "Required fields: full name and privacy email. Check the consent checkbox before form submission.",
  },
];

export const fastPeopleSearchExecutionResult: ExecutionResult = {
  site: "FastPeopleSearch",
  candidate_url: fastPeopleSearchCandidateUrl,
  status: "pending",
  confirmation: {
    ticket: null,
    page_text: "Your removal request has been received and is pending review.",
    screenshot_ref: "fixtures/fastpeoplesearch-confirmation.png",
  },
  error: null,
};

export const expectedFastPeopleSearchDiscovery: Partial<DiscoveryResult> = {
  site: "FastPeopleSearch",
  found: true,
};

export const fastPeopleSearchFixture = {
  site: "FastPeopleSearch",
  requestText: "Search for my name + Seattle and submit removals for everything you find.",
  seedProfile: fastPeopleSearchSeedProfile,
  listingPageText: fastPeopleSearchListingPageText,
  candidateUrl: fastPeopleSearchCandidateUrl,
  procedureChunks: fastPeopleSearchProcedureChunks,
  executionResult: fastPeopleSearchExecutionResult,
  expected: {
    minConfidence: 0.75,
    procedureType: "webform" as const,
    requiredFieldNames: ["full_name", "privacy_email"],
    nextStatus: "pending" as const,
    nextAction: "await_confirmation" as const,
  },
};
