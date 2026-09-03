import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  forgotPassword,
  getMe,
  login,
  logout,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
} from "../lib/auth";
import { AuthContext, ME_QUERY_KEY, type AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(ME_QUERY_KEY, null),
  });

  const forgotPasswordMutation = useMutation({ mutationFn: forgotPassword });
  const resetPasswordMutation = useMutation({ mutationFn: resetPassword });

  const verifyEmailMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  });

  const resendVerificationMutation = useMutation({ mutationFn: resendVerification });

  const value: AuthContextValue = {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    isAuthenticated: Boolean(meQuery.data),

    login: (input) => loginMutation.mutateAsync(input),
    signup: (input) => signupMutation.mutateAsync(input),
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    isLoginPending: loginMutation.isPending,
    isSignupPending: signupMutation.isPending,
    loginError: loginMutation.error,
    signupError: signupMutation.error,

    forgotPassword: (input) => forgotPasswordMutation.mutateAsync(input),
    isForgotPasswordPending: forgotPasswordMutation.isPending,
    forgotPasswordError: forgotPasswordMutation.error,

    resetPassword: (input) => resetPasswordMutation.mutateAsync(input),
    isResetPasswordPending: resetPasswordMutation.isPending,
    resetPasswordError: resetPasswordMutation.error,

    verifyEmail: (input) => verifyEmailMutation.mutateAsync(input),
    isVerifyEmailPending: verifyEmailMutation.isPending,
    verifyEmailError: verifyEmailMutation.error,

    resendVerification: async () => {
      await resendVerificationMutation.mutateAsync();
    },
    isResendVerificationPending: resendVerificationMutation.isPending,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
