import { useMutation } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";
import { AuthApiError } from "@/features/auth/repositories/auth.repository";
import type { LoginCredentials } from "@/features/auth/types";

export function useLogin() {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
  });
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
