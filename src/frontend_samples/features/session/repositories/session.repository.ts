import type { ApiSuccess } from "@/types/api";
import type { CurrentMember } from "@/features/session/types";
import { currentMemberMock } from "@/features/session/mocks/session.mock";

const SIMULATED_LATENCY_MS = 350;

export const sessionRepository = {
  async getCurrentMember(): Promise<ApiSuccess<CurrentMember>> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
    return currentMemberMock;

    // Live implementation, once the Express API exists:
    // const { data } = await apiClient.get<ApiSuccess<CurrentMember>>("/members/me");
    // return data;
  },
};
