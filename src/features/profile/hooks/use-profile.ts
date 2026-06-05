"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProfile, updateProfile } from "../api/profile";

const PROFILE_KEY = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      section,
      data,
    }: {
      section: string;
      data: Record<string, unknown>;
    }) => updateProfile(section, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}
