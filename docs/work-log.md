# Work Log

## 2026-03-12

### Update 1

Scaffolded the initial agent contract layer for the LLM and orchestration workflow.

Added:

- `src/lib/agent/contracts.ts`
- `src/lib/agent/state-machine.ts`
- `src/lib/agent/index.ts`
- `src/test/agent-contracts.test.ts`

This contract layer defines the shared schemas and TypeScript types for:

- agent run phases and statuses
- user intent and search profile input
- listing candidates and evidence
- match decisions with confidence scores
- retrieved opt-out procedures
- drafted opt-out requests
- automation handoffs
- workflow timeline events
- execution outcomes

It also defines the first-pass workflow state machine for the agent lifecycle:

`intake -> scan -> match -> retrieve_procedure -> draft -> approval -> execution -> verification -> logging -> completed`

Notes:

- The contract is backend-agnostic so the Lovable frontend can consume stable shapes later without being tightly coupled to LangGraph internals.
- Validation tests were added, but local verification is currently blocked because frontend dependencies are not installed in this workspace, so `npm test` and `npm run build` could not run.

### Update 3

Wired the existing frontend mock layer to the new agent contract schemas.

Completed:

- Added `src/lib/agent/mock-run.ts` as a schema-validated demo agent run fixture
- Reworked `src/lib/mock-data.ts` to derive dashboard, history, and listing detail data from the validated agent state instead of hard-coded standalone UI mocks
- Added `src/test/mock-data.test.ts` to verify the adapter output remains aligned with the contract-backed fixture

Result:

- The current Lovable frontend can keep using its existing component props and mock exports
- The underlying mock data now flows from the agent contract layer, which gives us a stable bridge to future backend and LangGraph integration

Verification:

- `npm test` passed with 3 test files and 10 total tests
- `npm run build` passed successfully

Notes:

- Build still emits a large bundle warning for the main JavaScript chunk. This is not blocking current work.

### Update 4

Defined the initial frontend-to-backend transport contract for the future FastAPI and LangGraph service.

Completed:

- Added `src/lib/agent/api.ts` with schema-validated request and response shapes for:
  - create run
  - get run
  - list runs
  - send chat command
  - submit approval
  - trigger rescan
  - append execution result
- Added `src/lib/agent/client.ts` with a small typed fetch client and a dedicated `AgentApiError`
- Updated `src/lib/agent/index.ts` exports to include the new transport layer
- Added `src/test/agent-api.test.ts` to validate both schema parsing and client request behavior

Result:

- The repo now has a concrete API contract the frontend can target before the FastAPI service exists
- The future backend can implement against stable paths and payloads instead of ad hoc UI-driven shapes

Verification:

- `npm test` passed with 4 test files and 15 total tests
- `npm run build` passed successfully

### Update 5

Added a React Query-backed dashboard integration layer on top of the agent mock service.

Completed:

- Added `src/lib/agent/mock-service.ts` as a temporary in-memory service that simulates dashboard reads and chat command updates
- Added `src/hooks/use-agent-dashboard.ts` with query and mutation hooks for dashboard data and chat submission
- Refactored `src/lib/mock-data.ts` into reusable adapter functions so UI shapes can be derived from any `AgentRunState`
- Updated `src/pages/DashboardPage.tsx` to read sites and chat messages through the hook layer
- Updated `src/pages/HistoryPage.tsx` to read activity log data through the same dashboard query abstraction
- Updated `src/components/ChatBar.tsx`, `src/components/SummaryBar.tsx`, and `src/components/ScanProgress.tsx` to accept data via props instead of importing singleton mocks directly
- Added `src/test/mock-agent-service.test.ts` to validate the temporary service behavior

Result:

- The current frontend now has a realistic integration seam for a future backend without forcing a major Lovable UI rewrite
- Chat interactions on the dashboard now flow through a mutation path instead of local component-only state

Verification:

- `npm test` passed with 5 test files and 17 total tests
- `npm run build` passed successfully

### Update 6

Normalized the agent contract layer to match the project spec more directly and added graph-node interface schemas for the proposed LangGraph workflow.

Completed:

- Extended `src/lib/agent/contracts.ts` with exact spec-level schemas for:
  - `SeedProfile`
  - `DiscoveryResult`
  - `ProcedureRetrieval`
  - `SubmissionPayload`
  - `ExecutionResult`
  - policy thresholds and guardrail config
- Added `src/lib/agent/graph.ts` with typed node input/output contracts for:
  - `validate_consent`
  - `discovery_parse`
  - `retrieve_procedure`
  - `draft_optout`
  - `plan_submission`
  - `interpret_result`
- Expanded `src/lib/agent/api.ts` to include a spec-aligned start-run request using `seed_profile`
- Updated exports in `src/lib/agent/index.ts`
- Added `src/test/agent-graph.test.ts`
- Expanded `src/test/agent-contracts.test.ts` and `src/test/agent-api.test.ts` to validate the spec-level shapes

Result:

- The repo now contains both the broader internal run-state model and the exact external schemas described in the Agent & LLM Logic spec
- The next step can be building the runnable LangGraph skeleton against stable node contracts rather than continuing to refine data shapes

Verification:

- `npm test` passed with 6 test files and 26 total tests
- `npm run build` passed successfully

### Update 7

Built the first runnable agent workflow skeleton for the proposed LangGraph phases.

Completed:

- Added `src/lib/agent/workflow.ts` with:
  - a conservative sequential workflow runner
  - typed node interfaces for the six proposed graph nodes
  - default deterministic node implementations for:
    - `validate_consent`
    - `discovery_parse`
    - `retrieve_procedure`
    - `draft_optout`
    - `plan_submission`
    - `interpret_result`
  - a simple in-memory site registry interface
- Updated `src/lib/agent/index.ts` exports to include the workflow module
- Added `src/test/agent-workflow.test.ts` covering:
  - one-site golden path
  - missing procedure fallback
  - low-confidence fallback

Result:

- The repo now has a runnable orchestration skeleton that follows the intended graph phases and enforces the core guardrails:
  - no progression without consent
  - no drafting without grounded procedure retrieval
  - no submission planning when match confidence is below threshold
- This is still deterministic placeholder logic, not LLM-backed reasoning, but it establishes the exact execution seam where prompt-driven node implementations can be dropped in next

Verification:

- `npm test` passed with 7 test files and 29 total tests
- `npm run build` passed successfully

### Update 8

Added the first prompt and structured-output adapter layer for the agent workflow.

Completed:

- Added `src/lib/agent/prompts.ts` with strict prompt definitions for:
  - listing classifier / extractor
  - procedure selector
  - draft generator
  - post-execution verifier
- Added `src/lib/agent/llm.ts` with:
  - a pluggable structured-output adapter interface
  - `createPromptBackedNodes(...)` to wire prompt-backed node implementations into the workflow
  - a fixture adapter for local testing without live model calls
- Updated `src/lib/agent/index.ts` exports to include the new prompt and adapter modules
- Added `src/test/agent-prompts.test.ts` to verify prompt construction and guardrail language
- Added `src/test/agent-llm.test.ts` to verify the workflow can run using prompt-backed nodes through the fixture adapter

Result:

- The repo now has a concrete seam for swapping deterministic placeholder node logic with real LLM-backed structured-output calls
- Prompting strategy is encoded in code rather than only in planning notes
- The workflow can already execute through model-style nodes without changing its outer orchestration contract

Verification:

- `npm test` passed with 9 test files and 33 total tests
- `npm run build` passed successfully

### Update 9

Added the first saved-artifact one-site golden path and lightweight evaluation harness for the agent workflow.

Completed:

- Added `src/lib/agent/fixtures/fastpeoplesearch.ts` with:
  - saved seed profile
  - saved listing page text
  - saved procedure chunks
  - saved execution result
  - expected outcome targets
- Added `src/lib/agent/eval.ts` with a lightweight golden-path evaluator
- Added `src/test/agent-golden-path.test.ts` to run the workflow end-to-end on the FastPeopleSearch fixture
- Added `src/test/agent-eval.test.ts` to evaluate the workflow output against expected match/procedure/draft/result checks
- Updated `src/lib/agent/index.ts` exports to include the evaluation helper

Result:

- The agent layer now has one concrete site fixture that exercises the workflow using saved artifacts rather than only synthetic inline test data
- The repo now has the beginnings of the evaluation harness described in the project plan
- This closes a major gap between schema design and real agent-behavior validation

Verification:

- `npm test` passed with 11 test files and 35 total tests
- `npm run build` passed successfully

### Update 10

Expanded the agent evaluation harness with adversarial fixtures for ambiguity and missing-procedure fallback behavior.

Completed:

- Added `src/lib/agent/fixtures/fastpeoplesearch-negative.ts` with:
  - an ambiguous-match fixture
  - a missing-procedure fixture
- Expanded `src/lib/agent/eval.ts` with review-fallback evaluation helpers
- Updated `src/test/agent-eval.test.ts` to validate:
  - happy-path fixture behavior
  - ambiguous-match fallback behavior
  - missing-procedure fallback behavior
- Updated `src/test/agent-golden-path.test.ts` to assert workflow blocking behavior on both adversarial fixtures

Result:

- The evaluation harness now tests two high-risk failure modes from the project spec:
  - ambiguous identity matches
  - ungrounded or missing opt-out procedures
- This improves confidence that the workflow will fail closed rather than over-submit when evidence is weak or retrieval is incomplete

Verification:

- `npm test` passed with 11 test files and 39 total tests
- `npm run build` passed successfully

## Remaining Work For Eddie

### Highest Priority

- Replace the fixture structured-output adapter with a real LLM model adapter
  - connect prompt-backed nodes to a live structured-output model client
  - preserve schema validation on all model outputs
  - verify the four prompt paths with real model calls:
    - listing classifier / extractor
    - procedure selector
    - draft generator
    - post-execution verifier

- Add real retrieval integration
  - connect procedure selection to a vector store or retrieval layer
  - load retrieved chunks dynamically instead of injecting saved chunks
  - handle stale, missing, or contradictory retrieval results explicitly

- Implement a real one-site end-to-end path
  - use one selected broker site as the first real integration target
  - connect listing artifact -> retrieval -> draft -> submission payload -> execution interpretation
  - keep the same evaluation fixtures to compare live behavior against expected outputs

### Next Priority

- Expand evaluation coverage
  - add more ambiguous-match and false-positive fixtures
  - add contradictory-retrieval fixtures
  - add draft completeness checks against required fields and policy constraints
  - measure fallback behavior quality, not just happy-path success

- Finalize policy defaults with the team
  - production match confidence threshold
  - retry policy
  - manual review escalation rules
  - pending confirmation handling rules
  - monitoring cadence

### Later

- Add monitoring / re-scan workflow
  - model the monthly or configurable recheck cycle
  - compare newly discovered listings against prior outcomes
  - trigger new removal cycles when re-listed

- Integrate real automation results
  - connect execution-result interpretation to Playwright outputs
  - consume confirmation text, ticket IDs, screenshots, and error states from actual automation

- Coordinate backend storage and endpoint implementation
  - map current schemas to FastAPI endpoints and persistence models
  - confirm what the backend will store for auditability and evaluation
