"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useResume, useUpdateResume } from "../hooks/use-resume";
import { ContactSection } from "./resume-editor-contact";
import { LinksSection } from "./resume-editor-links";
import { SkillsSection } from "./resume-editor-skills";
import { ListSection } from "./resume-editor-list";
import type { ResumeData } from "../api/resume";
import type { ListField } from "./resume-editor-list";

const EDUCATION_FIELDS: ListField[] = [
  { key: "degree", label: "Degree", placeholder: "e.g. B.S. Computer Science", required: true },
  { key: "institution", label: "Institution", placeholder: "e.g. MIT" },
  { key: "year", label: "Year", placeholder: "e.g. 2022" },
];

const EXPERIENCE_FIELDS: ListField[] = [
  { key: "company", label: "Company", placeholder: "e.g. Google", required: true },
  { key: "role", label: "Role", placeholder: "e.g. Senior Developer" },
  { key: "duration", label: "Duration", placeholder: "e.g. 2020-2023" },
  { key: "description", label: "Description", placeholder: "Brief description of role" },
];

const PROJECT_FIELDS: ListField[] = [
  { key: "name", label: "Name", placeholder: "e.g. Open Source Dashboard", required: true },
  { key: "description", label: "Description", placeholder: "Brief description" },
  { key: "url", label: "URL", placeholder: "https://github.com/project" },
];

type Dirtyable = Record<string, unknown>;

export function ResumeEditorForm() {
  const router = useRouter();
  const { data, isLoading, isError } = useResume();
  const updateMutation = useUpdateResume();

  const [form, setForm] = useState<ResumeData | null>(null);
  const [saved, setSaved] = useState(false);

  const resume = data?.resume;

  useEffect(() => {
    if (resume && form === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: resume.name ?? "",
        email: resume.email ?? "",
        phone: resume.phone ?? "",
        linkedin: resume.linkedin ?? "",
        github: resume.github ?? "",
        portfolio: resume.portfolio ?? "",
        skills: resume.skills ?? [],
        education: resume.education ?? [],
        experience: resume.experience ?? [],
        projects: resume.projects ?? [],
      });
    }
  }, [resume, form]);

  const initialSnapshot = resume
    ? JSON.stringify({
        name: resume.name ?? "",
        email: resume.email ?? "",
        phone: resume.phone ?? "",
        linkedin: resume.linkedin ?? "",
        github: resume.github ?? "",
        portfolio: resume.portfolio ?? "",
        skills: resume.skills ?? [],
        education: resume.education ?? [],
        experience: resume.experience ?? [],
        projects: resume.projects ?? [],
      })
    : null;

  const isDirty = form && initialSnapshot ? JSON.stringify(form as unknown as Dirtyable) !== initialSnapshot : false;

  useEffect(() => {
    if (!isDirty || saved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, saved]);

  const handleCancel = useCallback(() => {
    if (isDirty && !confirm("You have unsaved changes. Leave anyway?")) return;
    router.push("/settings?tab=resume");
  }, [isDirty, router]);

  const handleSave = useCallback(() => {
    if (!form) return;
    updateMutation.mutate(form, {
      onSuccess: () => {
        setSaved(true);
        router.push("/settings?tab=resume");
      },
    });
  }, [form, updateMutation, router]);

  const setField = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (isLoading) {
    return (
      <div className="resume-editor__loading">
        <div className="resume-editor__skeleton" />
        <div className="resume-editor__skeleton" />
        <div className="resume-editor__skeleton" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="resume-editor__error">
        <p className="settings-message settings-message--error">
          Failed to load resume data. Please try again.
        </p>
        <button className="settings-section__save" onClick={() => router.push("/settings?tab=resume")}>
          Back to Settings
        </button>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="resume-editor__error">
        <p className="settings-message settings-message--error">
          No resume found. Please upload a resume first.
        </p>
        <button className="settings-section__save" onClick={() => router.push("/settings?tab=resume")}>
          Back to Settings
        </button>
      </div>
    );
  }

  if (!form) return null;

  const saveError = updateMutation.isError
    ? (updateMutation.error as Error)?.message ?? "Failed to save changes"
    : null;

  return (
    <div className="resume-editor">
      {saveError && (
        <div className="settings-message settings-message--error">{saveError}</div>
      )}

      <div className="resume-editor__sections">
        <ContactSection
          name={form.name ?? ""}
          email={form.email ?? ""}
          phone={form.phone ?? ""}
          onChange={(field, value) => setField(field, value)}
        />

        <LinksSection
          linkedin={form.linkedin ?? ""}
          github={form.github ?? ""}
          portfolio={form.portfolio ?? ""}
          onChange={(field, value) => setField(field, value)}
        />

        <SkillsSection
          skills={form.skills ?? []}
          onChange={(skills) => setField("skills", skills)}
        />

        <ListSection
          title="Education"
          items={form.education ?? []}
          fields={EDUCATION_FIELDS}
          maxItems={5}
          onChange={(items) => setField("education", items as ResumeData["education"])}
        />

        <ListSection
          title="Experience"
          items={form.experience ?? []}
          fields={EXPERIENCE_FIELDS}
          maxItems={10}
          onChange={(items) => setField("experience", items as ResumeData["experience"])}
        />

        <ListSection
          title="Projects"
          items={form.projects ?? []}
          fields={PROJECT_FIELDS}
          maxItems={10}
          onChange={(items) => setField("projects", items as ResumeData["projects"])}
        />
      </div>

      <div className="resume-editor__footer">
        <button className="resume-editor__cancel-btn resume-editor__cancel-btn--large" onClick={handleCancel} type="button">
          Cancel
        </button>
        <button
          className="settings-section__save"
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending || saved}
          type="button"
        >
          {updateMutation.isPending ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/resume-editor-form.tsx
// ============================================================
// PURPOSE: Orchestrates the entire resume editing experience with sections, dirty tracking, and save/cancel.
// HOW IT WORKS: Fetches resume data via useResume, clones it into local state. Tracks dirty state
//   via JSON deep comparison against the initial snapshot. Shows beforeunload warning when dirty.
//   ContactSection, LinksSection, SkillsSection, and ListSection render editable accordion sections.
//   Save calls useUpdateResume mutation and navigates back to settings on success. Cancel
//   navigates back with confirmation if dirty.
// PROPS: None (self-contained)
// INTEGRATION: useResume, useUpdateResume, all section editors, next/navigation
// ============================================================
