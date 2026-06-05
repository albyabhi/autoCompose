import { api } from "@/lib/api-client";

export interface ResumeData {
  rawText?: string;
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  skills: string[];
  education: { degree: string; institution?: string; year?: string }[];
  experience: { company: string; role?: string; duration?: string; description?: string }[];
  projects: { name: string; description?: string; url?: string }[];
}

export async function fetchResume(): Promise<{ resume: ResumeData | null }> {
  return api.get<{ resume: ResumeData | null }>("/api/profile/resume");
}

export async function uploadResume(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<{ resume: ResumeData }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/profile/resume", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message ?? "Failed to upload resume");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Streaming not supported");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.type === "progress" && onProgress) {
          onProgress(data.progress, data.message);
        } else if (data.type === "success") {
          return data.data;
        } else if (data.type === "error") {
          throw new Error(data.message);
        }
      } catch (e) {
        console.error("Failed to parse stream line:", line);
      }
    }
  }

  throw new Error("Stream ended unexpectedly");
}

export async function deleteResume(): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>("/api/profile/resume");
}
