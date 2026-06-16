"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchResume, uploadResume, deleteResume } from "../api/resume";
import type { ModelId } from "@/modules/ai/types";

const RESUME_KEY = ["resume"] as const;

export function useResume() {
  return useQuery({
    queryKey: RESUME_KEY,
    queryFn: fetchResume,
  });
}

export function useUploadResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      modelId,
      onProgress,
    }: {
      file: File;
      modelId: ModelId;
      onProgress?: (progress: number, message: string) => void;
    }) => uploadResume(file, modelId, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESUME_KEY });
    },
  });
}

export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteResume(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESUME_KEY });
    },
  });
}

// ============================================================
// FILE: src/features/profile/hooks/use-resume.ts
// ============================================================
// PURPOSE: React Query hooks for fetching, uploading (with streaming progress), and deleting the user's parsed resume.
// HOW IT works: useResume queries the resume endpoint. useUploadResume accepts a File, modelId, and optional onProgress callback, calling the streaming upload API. useDeleteResume sends a DELETE request. All mutations invalidate the resume query cache on success.
// INTEGRATION: @tanstack/react-query, resume API client (fetchResume, uploadResume, deleteResume), ModelId type.
// ============================================================
