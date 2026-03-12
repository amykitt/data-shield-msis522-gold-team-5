import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mockAgentService } from "@/lib/agent/mock-service";

export const agentQueryKeys = {
  dashboard: ["agent", "dashboard"] as const,
} as const;

export function useAgentDashboard() {
  return useQuery({
    queryKey: agentQueryKeys.dashboard,
    queryFn: () => mockAgentService.getDashboardSnapshot(),
  });
}

export function useAgentChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => mockAgentService.sendChatCommand(message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agentQueryKeys.dashboard });
    },
  });
}