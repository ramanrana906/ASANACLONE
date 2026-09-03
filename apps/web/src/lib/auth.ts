import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  User,
  VerifyEmailInput,
} from "@asanaClone/shared";
import { API_URL, apiFetch } from "./api";

export function signup(input: SignupInput) {
  return apiFetch<User>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput) {
  return apiFetch<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout() {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export function getMe() {
  return apiFetch<User>("/api/auth/me");
}

export function forgotPassword(input: ForgotPasswordInput) {
  return apiFetch<{ ok: boolean }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resetPassword(input: ResetPasswordInput) {
  return apiFetch<{ ok: boolean }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function verifyEmail(input: VerifyEmailInput) {
  return apiFetch<{ ok: boolean }>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resendVerification() {
  return apiFetch<{ ok: boolean }>("/api/auth/resend-verification", { method: "POST" });
}

export const googleSignInUrl = `${API_URL}/api/auth/google`;
