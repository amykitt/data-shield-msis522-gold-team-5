import { describe, expect, it } from "vitest";

import { mockAgentService } from "@/lib/agent/mock-service";

describe("mock agent service", () => {
  it("returns a dashboard snapshot derived from the agent run", async () => {
    const snapshot = await mockAgentService.getDashboardSnapshot();

    expect(snapshot.runId).toBe("run_demo_001");
    expect(snapshot.brokerSites.length).toBeGreaterThan(0);
    expect(snapshot.chatMessages.length).toBeGreaterThan(0);
  });

  it("appends chat messages and preserves the dashboard abstraction", async () => {
    const before = await mockAgentService.getDashboardSnapshot();

    await mockAgentService.sendChatCommand("submit the pending removals");

    const after = await mockAgentService.getDashboardSnapshot();

    expect(after.chatMessages.length).toBe(before.chatMessages.length + 2);
    expect(after.chatMessages.at(-1)?.role).toBe("assistant");
  });
});