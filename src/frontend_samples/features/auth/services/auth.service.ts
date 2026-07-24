import { authRepository } from "@/features/auth/repositories/auth.repository";
import type { LoginCredentials, LoginResult } from "@/features/auth/types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const response = await authRepository.login(credentials);
    return response.data;
  },
};
