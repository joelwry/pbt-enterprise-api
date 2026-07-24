import type { ApiSuccess } from "@/types/api";
import type { CurrentMember } from "@/features/session/types";

export const currentMemberMock: ApiSuccess<CurrentMember> = {
  success: true,
  message: "Current member retrieved successfully",
  data: {
    id: "mem_01H8X9",
    clientId: "PBT-04231",
    fullName: "Kudirat Olowosale",
    initials: "KO",
    email: "kudirat@olowosaleproperty.co.uk",
    membershipTier: "Mentorship",
  },
};
