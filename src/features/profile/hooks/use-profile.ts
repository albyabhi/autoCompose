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

// ============================================================
// FILE: src/features/profile/hooks/use-profile.ts
// ============================================================
// PURPOSE: React Query hooks for fetching and updating the user profile.
// HOW IT WORKS: useProfile wraps a query on the "profile" key calling fetchProfile. useUpdateProfile wraps a mutation that calls updateProfile with a section name and data object, then invalidates the profile query cache on success.
// INTEGRATION: @tanstack/react-query, profile API client (fetchProfile, updateProfile).
// ============================================================
