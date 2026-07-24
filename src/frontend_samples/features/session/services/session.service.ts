import { sessionRepository } from "@/features/session/repositories/session.repository";
import type { CurrentMember } from "@/features/session/types";

export const sessionService = {
  async getCurrentMember(): Promise<CurrentMember> {
    const response = await sessionRepository.getCurrentMember();
    return response.data;
  },
};
