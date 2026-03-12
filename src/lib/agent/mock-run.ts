import { agentRunStateSchema, type AgentRunState } from "@/lib/agent/contracts";

export const mockAgentRunState: AgentRunState = agentRunStateSchema.parse({
  runId: "run_demo_001",
  profile: {
    profileId: "profile_demo_001",
    firstName: "John",
    lastName: "Doe",
    city: "Seattle",
    state: "Washington",
    proxyEmail: "shield-a7x29k@detraceme.io",
  },
  intent: {
    requestText: "Search for my name + Seattle and submit removals for everything you find.",
    requestedActions: ["scan_only", "submit_opt_out"],
    geographicHint: "Seattle",
    requestedSites: [
      "spokeo",
      "whitepages",
      "beenverified",
      "intelius",
      "peoplefinder",
      "truepeoplesearch",
      "fastpeoplesearch",
      "thatsthem",
      "radaris",
      "ussearch",
      "pipl",
      "zabasearch"
    ],
    requiresUserApprovalBeforeSubmission: true,
  },
  currentPhase: "approval",
  status: "awaiting_user",
  consentConfirmed: true,
  targets: [
    { siteId: "spokeo", siteName: "Spokeo", query: "John Doe Seattle WA" },
    { siteId: "whitepages", siteName: "WhitePages", query: "John Doe Seattle WA" },
    { siteId: "beenverified", siteName: "BeenVerified", query: "John Doe Seattle WA" },
    { siteId: "intelius", siteName: "Intelius", query: "John Doe Seattle WA" },
    { siteId: "peoplefinder", siteName: "PeopleFinder", query: "John Doe Seattle WA" },
    { siteId: "truepeoplesearch", siteName: "TruePeopleSearch", query: "John Doe Seattle WA" },
    { siteId: "fastpeoplesearch", siteName: "FastPeopleSearch", query: "John Doe Seattle WA" },
    { siteId: "thatsthem", siteName: "ThatsThem", query: "John Doe Seattle WA" },
    { siteId: "radaris", siteName: "Radaris", query: "John Doe Seattle WA" },
    { siteId: "ussearch", siteName: "USSearch", query: "John Doe Seattle WA" },
    { siteId: "pipl", siteName: "Pipl", query: "John Doe Seattle WA" },
    { siteId: "zabasearch", siteName: "ZabaSearch", query: "John Doe Seattle WA" }
  ],
  candidates: [
    {
      candidateId: "cand_spokeo_001",
      siteId: "spokeo",
      siteName: "Spokeo",
      listingUrl: "https://spokeo.com/john-doe/seattle-wa",
      displayName: "John Doe",
      extractedFields: [
        { field: "Full Name", value: "John Doe" },
        { field: "Home Address", value: "123 Pine St, Seattle, WA" },
        { field: "Phone Number", value: "(206) 555-0114" },
        { field: "Email", value: "john@example.com" },
        { field: "Relatives", value: ["Jane Doe", "Michael Doe"] },
        { field: "Age", value: "35" }
      ],
      evidence: [
        {
          sourceType: "listing_page",
          sourceUrl: "https://spokeo.com/john-doe/seattle-wa",
          excerpt: "John Doe, age 35, Seattle, WA",
          capturedAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    },
    {
      candidateId: "cand_whitepages_001",
      siteId: "whitepages",
      siteName: "WhitePages",
      listingUrl: "https://whitepages.com/name/john-doe/seattle-wa",
      displayName: "John Doe",
      extractedFields: [
        { field: "Full Name", value: "John Doe" },
        { field: "Current Address", value: "123 Pine St, Seattle, WA" },
        { field: "Previous Addresses", value: ["456 Oak Ave, Seattle, WA"] },
        { field: "Phone Number", value: "(206) 555-0114" },
        { field: "Associates", value: ["Jane Doe"] }
      ],
      evidence: [
        {
          sourceType: "listing_page",
          sourceUrl: "https://whitepages.com/name/john-doe/seattle-wa",
          excerpt: "John Doe in Seattle, WA",
          capturedAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    },
    {
      candidateId: "cand_truepeoplesearch_001",
      siteId: "truepeoplesearch",
      siteName: "TruePeopleSearch",
      listingUrl: "https://truepeoplesearch.com/find/john-doe/seattle-wa",
      displayName: "John Doe",
      extractedFields: [
        { field: "Full Name", value: "John Doe" },
        { field: "Address", value: "123 Pine St, Seattle, WA" },
        { field: "Phone", value: "(206) 555-0114" },
        { field: "Age", value: "35" },
        { field: "Previous Cities", value: ["Tacoma, WA"] }
      ],
      evidence: [
        {
          sourceType: "listing_page",
          sourceUrl: "https://truepeoplesearch.com/find/john-doe/seattle-wa",
          excerpt: "John Doe, Seattle, WA",
          capturedAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    },
    {
      candidateId: "cand_radaris_001",
      siteId: "radaris",
      siteName: "Radaris",
      listingUrl: "https://radaris.com/p/John/Doe/",
      displayName: "John Doe",
      extractedFields: [
        { field: "Full Name", value: "John Doe" },
        { field: "Address", value: "123 Pine St, Seattle, WA" },
        { field: "Phone", value: "(206) 555-0114" },
        { field: "Court Records", value: "1 result" },
        { field: "Social Profiles", value: ["linkedin.com/in/johndoe"] }
      ],
      evidence: [
        {
          sourceType: "listing_page",
          sourceUrl: "https://radaris.com/p/John/Doe/",
          excerpt: "John Doe, Seattle, WA, possible relatives listed",
          capturedAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    }
  ],
  matchDecisions: [
    {
      siteId: "spokeo",
      candidateId: "cand_spokeo_001",
      decision: "likely_match",
      confidence: 0.97,
      rationale: "Name, location, age, and associated phone number align with the user profile.",
      evidence: [
        {
          sourceType: "listing_page",
          sourceUrl: "https://spokeo.com/john-doe/seattle-wa",
          excerpt: "John Doe, age 35, Seattle, WA",
          capturedAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    },
    {
      siteId: "whitepages",
      candidateId: "cand_whitepages_001",
      decision: "likely_match",
      confidence: 0.95,
      rationale: "Name, current address, and phone number match the user profile.",
      evidence: [
        {
          sourceType: "listing_page",
          sourceUrl: "https://whitepages.com/name/john-doe/seattle-wa",
          excerpt: "John Doe in Seattle, WA",
          capturedAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    },
    {
      siteId: "truepeoplesearch",
      candidateId: "cand_truepeoplesearch_001",
      decision: "likely_match",
      confidence: 0.94,
      rationale: "Name, city, and contact details overlap with the user profile.",
      evidence: [
        {
          sourceType: "listing_page",
          sourceUrl: "https://truepeoplesearch.com/find/john-doe/seattle-wa",
          excerpt: "John Doe, Seattle, WA",
          capturedAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    },
    {
      siteId: "radaris",
      candidateId: "cand_radaris_001",
      decision: "likely_match",
      confidence: 0.92,
      rationale: "Name and address align strongly enough to request review and opt-out drafting.",
      evidence: [
        {
          sourceType: "listing_page",
          sourceUrl: "https://radaris.com/p/John/Doe/",
          excerpt: "John Doe, Seattle, WA",
          capturedAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    }
  ],
  procedures: [
    {
      siteId: "spokeo",
      procedureId: "proc_spokeo_v3",
      source: "rag",
      sourceDocumentUri: "sites/spokeo/procedure-v3.md",
      sourceVersion: "v3",
      retrievedAt: "2026-03-08T10:01:00.000Z",
      submissionChannel: "webform",
      freshnessDays: 4,
      isComplete: true,
      requiredInputs: [
        { key: "full_name", label: "Full name", required: true, source: "profile" },
        { key: "proxy_email", label: "Proxy email", required: true, source: "system" }
      ],
      steps: [
        {
          stepId: "step_spokeo_1",
          action: "navigate",
          instruction: "Open the opt-out form.",
          targetUrl: "https://spokeo.com/optout"
        }
      ]
    },
    {
      siteId: "whitepages",
      procedureId: "proc_whitepages_v2",
      source: "rag",
      sourceDocumentUri: "sites/whitepages/procedure-v2.md",
      sourceVersion: "v2",
      retrievedAt: "2026-03-08T10:01:00.000Z",
      submissionChannel: "webform",
      freshnessDays: 6,
      isComplete: true,
      requiredInputs: [
        { key: "full_name", label: "Full name", required: true, source: "profile" },
        { key: "proxy_email", label: "Proxy email", required: true, source: "system" }
      ],
      steps: [
        {
          stepId: "step_whitepages_1",
          action: "navigate",
          instruction: "Open the WhitePages suppression page.",
          targetUrl: "https://whitepages.com/suppression-requests"
        }
      ]
    },
    {
      siteId: "truepeoplesearch",
      procedureId: "proc_truepeoplesearch_v1",
      source: "rag",
      sourceDocumentUri: "sites/truepeoplesearch/procedure-v1.md",
      sourceVersion: "v1",
      retrievedAt: "2026-03-08T10:01:00.000Z",
      submissionChannel: "webform",
      freshnessDays: 8,
      isComplete: true,
      requiredInputs: [
        { key: "full_name", label: "Full name", required: true, source: "profile" },
        { key: "proxy_email", label: "Proxy email", required: true, source: "system" }
      ],
      steps: [
        {
          stepId: "step_truepeoplesearch_1",
          action: "navigate",
          instruction: "Open the removal form.",
          targetUrl: "https://truepeoplesearch.com/removal"
        }
      ]
    },
    {
      siteId: "radaris",
      procedureId: "proc_radaris_v1",
      source: "rag",
      sourceDocumentUri: "sites/radaris/procedure-v1.md",
      sourceVersion: "v1",
      retrievedAt: "2026-03-08T10:01:00.000Z",
      submissionChannel: "email",
      freshnessDays: 9,
      isComplete: true,
      requiredInputs: [
        { key: "full_name", label: "Full name", required: true, source: "profile" },
        { key: "proxy_email", label: "Proxy email", required: true, source: "system" }
      ],
      steps: [
        {
          stepId: "step_radaris_1",
          action: "check_email",
          instruction: "Submit the removal request using the privacy email workflow."
        }
      ]
    }
  ],
  drafts: [
    {
      draftId: "draft_spokeo_001",
      siteId: "spokeo",
      candidateId: "cand_spokeo_001",
      submissionChannel: "webform",
      body: "To whom it may concern,\n\nI am writing to request the immediate removal of my personal information from your database pursuant to applicable privacy laws.\n\nName: John Doe\nProxy Email: shield-a7x29k@detraceme.io\n\nPlease confirm removal within 72 hours.\n\nRegards,\nDetraceMe Agent",
      factsUsed: [
        { field: "Full Name", value: "John Doe" },
        { field: "Home Address", value: "123 Pine St, Seattle, WA" }
      ],
      procedureId: "proc_spokeo_v3",
      generatedAt: "2026-03-08T10:01:30.000Z"
    },
    {
      draftId: "draft_whitepages_001",
      siteId: "whitepages",
      candidateId: "cand_whitepages_001",
      submissionChannel: "webform",
      body: "Dear WhitePages Team,\n\nI hereby request the deletion of all personal records associated with my identity from your platform.\n\nName: John Doe\nProxy Email: shield-a7x29k@detraceme.io\n\nPlease confirm within 72 hours.\n\nRegards,\nDetraceMe Agent",
      factsUsed: [
        { field: "Full Name", value: "John Doe" },
        { field: "Current Address", value: "123 Pine St, Seattle, WA" }
      ],
      procedureId: "proc_whitepages_v2",
      generatedAt: "2026-03-08T10:01:30.000Z"
    },
    {
      draftId: "draft_truepeoplesearch_001",
      siteId: "truepeoplesearch",
      candidateId: "cand_truepeoplesearch_001",
      submissionChannel: "webform",
      body: "Dear TruePeopleSearch,\n\nPlease remove all records associated with my personal data from your website.\n\nName: John Doe\nProxy Email: shield-a7x29k@detraceme.io\n\nThank you.",
      factsUsed: [
        { field: "Full Name", value: "John Doe" },
        { field: "Address", value: "123 Pine St, Seattle, WA" }
      ],
      procedureId: "proc_truepeoplesearch_v1",
      generatedAt: "2026-03-08T10:01:30.000Z"
    },
    {
      draftId: "draft_radaris_001",
      siteId: "radaris",
      candidateId: "cand_radaris_001",
      submissionChannel: "email",
      body: "Dear Radaris,\n\nI request the removal of my personal information from your database.\n\nName: John Doe\nProxy Email: shield-a7x29k@detraceme.io\n\nPlease comply within 72 hours.",
      factsUsed: [
        { field: "Full Name", value: "John Doe" },
        { field: "Address", value: "123 Pine St, Seattle, WA" }
      ],
      procedureId: "proc_radaris_v1",
      generatedAt: "2026-03-08T10:01:30.000Z"
    }
  ],
  handoffs: [
    {
      handoffId: "handoff_spokeo_001",
      mode: "human_assisted",
      requiresUserApproval: true,
      reviewReasons: ["manual_submission_required"],
      createdAt: "2026-03-08T10:02:00.000Z",
      payload: {
        siteId: "spokeo",
        candidateId: "cand_spokeo_001",
        procedureId: "proc_spokeo_v3",
        procedureVersion: "v3",
        submissionChannel: "webform",
        fields: {
          full_name: "John Doe",
          proxy_email: "shield-a7x29k@detraceme.io"
        },
        steps: [
          {
            stepId: "step_spokeo_1",
            action: "navigate",
            instruction: "Open the opt-out form.",
            targetUrl: "https://spokeo.com/optout"
          }
        ],
        draft: {
          draftId: "draft_spokeo_001",
          siteId: "spokeo",
          candidateId: "cand_spokeo_001",
          submissionChannel: "webform",
          body: "To whom it may concern,\n\nI am writing to request the immediate removal of my personal information from your database pursuant to applicable privacy laws.\n\nName: John Doe\nProxy Email: shield-a7x29k@detraceme.io\n\nPlease confirm removal within 72 hours.\n\nRegards,\nDetraceMe Agent",
          factsUsed: [{ field: "Full Name", value: "John Doe" }],
          procedureId: "proc_spokeo_v3",
          generatedAt: "2026-03-08T10:01:30.000Z"
        }
      }
    }
  ],
  outcomes: [
    {
      siteId: "beenverified",
      candidateId: "cand_beenverified_001",
      status: "confirmed",
      confirmationId: "confirm_beenverified_001",
      observedAt: "2026-03-08T10:05:00.000Z",
      evidence: [
        {
          sourceType: "execution_log",
          excerpt: "Opt-out confirmation received from BeenVerified.",
          capturedAt: "2026-03-08T10:05:00.000Z"
        }
      ]
    },
    {
      siteId: "fastpeoplesearch",
      candidateId: "cand_fastpeoplesearch_001",
      status: "confirmed",
      confirmationId: "confirm_fastpeoplesearch_001",
      observedAt: "2026-03-08T10:05:00.000Z",
      evidence: [
        {
          sourceType: "execution_log",
          excerpt: "Opt-out confirmation received from FastPeopleSearch.",
          capturedAt: "2026-03-08T10:05:00.000Z"
        }
      ]
    }
  ],
  pendingReviewReasons: ["manual_submission_required"],
  timeline: [
    {
      eventId: "evt_scan_intelius",
      runId: "run_demo_001",
      phase: "scan",
      status: "in_progress",
      message: "Scan initiated for Intelius.",
      createdAt: "2026-03-01T10:00:00.000Z",
      siteId: "intelius"
    },
    {
      eventId: "evt_scan_peoplefinder",
      runId: "run_demo_001",
      phase: "logging",
      status: "completed",
      message: "Scan complete - not found on PeopleFinder.",
      createdAt: "2026-03-04T10:00:00.000Z",
      siteId: "peoplefinder"
    },
    {
      eventId: "evt_match_spokeo_old",
      runId: "run_demo_001",
      phase: "match",
      status: "completed",
      message: "Previous removal re-listed on Spokeo.",
      createdAt: "2026-03-05T10:00:00.000Z",
      siteId: "spokeo"
    },
    {
      eventId: "evt_found_truepeoplesearch",
      runId: "run_demo_001",
      phase: "match",
      status: "completed",
      message: "Listing found on TruePeopleSearch.",
      createdAt: "2026-03-06T10:00:00.000Z",
      siteId: "truepeoplesearch"
    },
    {
      eventId: "evt_found_radaris",
      runId: "run_demo_001",
      phase: "match",
      status: "completed",
      message: "Listing found on Radaris.",
      createdAt: "2026-03-06T10:00:00.000Z",
      siteId: "radaris"
    },
    {
      eventId: "evt_found_spokeo",
      runId: "run_demo_001",
      phase: "match",
      status: "completed",
      message: "Listing found on Spokeo.",
      createdAt: "2026-03-07T10:00:00.000Z",
      siteId: "spokeo"
    },
    {
      eventId: "evt_found_whitepages",
      runId: "run_demo_001",
      phase: "match",
      status: "completed",
      message: "Listing found on WhitePages.",
      createdAt: "2026-03-07T10:00:00.000Z",
      siteId: "whitepages"
    },
    {
      eventId: "evt_optout_beenverified",
      runId: "run_demo_001",
      phase: "verification",
      status: "completed",
      message: "Opt-out submitted for BeenVerified.",
      createdAt: "2026-03-08T10:00:00.000Z",
      siteId: "beenverified"
    },
    {
      eventId: "evt_optout_fastpeoplesearch",
      runId: "run_demo_001",
      phase: "verification",
      status: "completed",
      message: "Opt-out submitted for FastPeopleSearch.",
      createdAt: "2026-03-08T10:00:00.000Z",
      siteId: "fastpeoplesearch"
    },
    {
      eventId: "evt_scan_ussearch",
      runId: "run_demo_001",
      phase: "scan",
      status: "in_progress",
      message: "Scan initiated for USSearch.",
      createdAt: "2026-03-08T10:00:00.000Z",
      siteId: "ussearch"
    },
    {
      eventId: "evt_scan_pipl_failed",
      runId: "run_demo_001",
      phase: "scan",
      status: "failed",
      message: "Scan failed for Pipl due to a site error.",
      createdAt: "2026-03-08T10:00:00.000Z",
      siteId: "pipl",
      reviewReasons: ["site_unreachable"]
    },
    {
      eventId: "evt_chat_prompt",
      runId: "run_demo_001",
      phase: "approval",
      status: "awaiting_user",
      message: "Welcome back! Your scan found 4 new listings across data broker sites. Would you like me to submit removal requests for all of them?",
      createdAt: "2026-03-08T10:00:00.000Z"
    },
    {
      eventId: "evt_chat_response",
      runId: "run_demo_001",
      phase: "approval",
      status: "awaiting_user",
      message: "Got it. I've drafted opt-out requests for Spokeo and WhitePages using your proxy email. You can review them in the listing detail panel before I send them.",
      createdAt: "2026-03-08T10:01:30.000Z"
    }
  ],
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-08T10:05:00.000Z"
});