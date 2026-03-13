import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ExecutionResult, SeedProfile } from "@/lib/agent";

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

const fixtureArtifactPath = (...pathSegments: string[]) =>
  resolve(process.cwd(), "src", "lib", "agent", "fixtures", "artifacts", ...pathSegments);

export const ambiguousFastPeopleSearchFixture = {
  site: "FastPeopleSearch",
  requestText: "Search for my name + Seattle and submit removals for everything you find.",
  seedProfile: sharedSeedProfile,
  listingPageText: readFileSync(
    fixtureArtifactPath("fastpeoplesearch", "listing-page-ambiguous.txt"),
    "utf8",
  ).trim(),
  candidateUrl: "https://fastpeoplesearch.test/listing/possible-jane-doe",
  executionResult: sharedExecutionResult,
  expected: {
    maxConfidence: 0.74,
    requiredReviewReason: "low_confidence_match" as const,
  },
};
