import { createContext, useContext } from "react";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  User,
  VerifyEmailInput,
} from "@asanaClone/shared";

export const ME_QUERY_KEY = ["auth", "me"] as const;

export interface AuthContextValue {
  user: User | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => Promise<void>;
  isLoginPending: boolean;
  isSignupPending: boolean;
  loginError: Error | null;
  signupError: Error | null;

  forgotPassword: (input: ForgotPasswordInput) => Promise<{ ok: boolean }>;
  isForgotPasswordPending: boolean;
  forgotPasswordError: Error | null;

  resetPassword: (input: ResetPasswordInput) => Promise<{ ok: boolean }>;
  isResetPasswordPending: boolean;
  resetPasswordError: Error | null;

  verifyEmail: (input: VerifyEmailInput) => Promise<{ ok: boolean }>;
  isVerifyEmailPending: boolean;
  verifyEmailError: Error | null;

  resendVerification: () => Promise<void>;
  isResendVerificationPending: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
