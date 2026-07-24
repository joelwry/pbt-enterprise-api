import type { ApiSuccess, ApiError } from "@/types/api";
import type { LoginCredentials, LoginResult } from "@/features/auth/types";
import { loginSuccessMock, loginInvalidCredentialsMock } from "@/features/auth/mocks/auth.mock";

const SIMULATED_LATENCY_MS = 700;

export class AuthApiError extends Error {
  errors: string[];
  constructor(payload: ApiError) {
    super(payload.message);
    this.errors = payload.errors;
  }
}

export const authRepository = {
  async login(credentials: LoginCredentials): Promise<ApiSuccess<LoginResult>> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

    if (!credentials.email || !credentials.password) {
      throw new AuthApiError(loginInvalidCredentialsMock);
    }

    // Demo-only guard so the FRONTEND_REVIEW error-state requirement is checkable
    // without a backend: any real-looking credentials succeed except this one.
    if (credentials.password.toLowerCase() === "wrongpassword") {
      throw new AuthApiError(loginInvalidCredentialsMock);
    }

    return loginSuccessMock;

    // Live implementation, once the Express API exists:
    // const { data } = await apiClient.post<ApiSuccess<LoginResult>>("/auth/login", credentials);
    // return data;
  },
};
