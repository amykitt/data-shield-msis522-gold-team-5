import { describe, expect, it } from "vitest";

import { mockAgentRunState } from "@/lib/agent/mock-run";
import { getScanSummary, mockBrokerSites, mockHistory } from "@/lib/mock-data";

describe("mock data adapters", () => {
  it("derives dashboard scan counts from the schema-backed agent state", () => {
    const summary = getScanSummary(mockBrokerSites);

    expect(summary.total).toBe(mockAgentRunState.targets.length);
    expect(summary.found).toBe(4);
    expect(summary.optedOut).toBe(2);
    expect(summary.scanning).toBe(2);
    expect(summary.notFound).toBe(3);
    expect(summary.failed).toBe(1);
  });

  it("exposes found-site details from matched candidates and drafts", () => {
    const spokeo = mockBrokerSites.find((site) => site.id === "spokeo");

    expect(spokeo?.status).toBe("found");
    expect(spokeo?.foundData?.fields).toContain("Full Name");
    expect(spokeo?.foundData?.optOutMessage).toContain("shield-a7x29k@detraceme.io");
  });

  it("builds history entries from workflow events", () => {
    expect(mockHistory.some((entry) => entry.site === "Spokeo" && entry.status === "re_listed")).toBe(true);
    expect(mockHistory.some((entry) => entry.site === "BeenVerified" && entry.status === "confirmed")).toBe(true);
  });
});