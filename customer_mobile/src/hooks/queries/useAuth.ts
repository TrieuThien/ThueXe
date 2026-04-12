import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY } from "../../constants";
import { authApi } from "../../services";
import { useAuthStore } from "../../store";
import { ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest, User, VerifyOtpRequest } from "../../types";

export function useAuth() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const clearSession = useAuthStore((state) => state.clearSession);

  const meQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.auth.me(),
    queryFn: authApi.getMe,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (session) => {
      setSession({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken ?? "",
        user: session.user,
      });
      queryClient.setQueryData<User>(QUERY_KEY_FACTORY.auth.me(), session.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterRequest) => authApi.register(payload),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (payload: VerifyOtpRequest) => authApi.verifyOtp(payload),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (payload: ForgotPasswordRequest) => authApi.forgotPassword(payload),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (payload: ResetPasswordRequest) => authApi.resetPassword(payload),
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(useAuthStore.getState().refreshToken ?? undefined),
    onSuccess: async () => {
      clearSession();
      await queryClient.clear();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: Partial<User>) => authApi.updateMe(payload),
    onSuccess: (profile) => {
      setProfile(profile);
      queryClient.setQueryData<User>(QUERY_KEY_FACTORY.auth.me(), profile);
    },
  });

  return {
    meQuery,
    loginMutation,
    registerMutation,
    verifyOtpMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
    logoutMutation,
    updateProfileMutation,
  };
}
