import type { ApiSuccess, ApiError } from "@/types/api";
import type { LoginResult } from "@/features/auth/types";

export const loginSuccessMock: ApiSuccess<LoginResult> = {
  success: true,
  message: "Signed in successfully",
  data: {
    memberId: "mem_01H8X9",
    clientId: "PBT-04231",
    fullName: "Kudirat Olowosale",
  },
};

export const loginInvalidCredentialsMock: ApiError = {
  success: false,
  message: "Invalid email or password",
  errors: ["The email or password you entered is incorrect."],
};
