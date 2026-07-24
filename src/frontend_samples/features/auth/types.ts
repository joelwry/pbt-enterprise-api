export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResult {
  memberId: string;
  clientId: string;
  fullName: string;
}
