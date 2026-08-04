"use client";

import { useProfile, useUpdateProfile } from "../hooks/use-profile";
import { useState, useCallback } from "react";
import { SkeletonList } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";
import { CATEGORY_POLICIES, isEmailCategory, type ProfileSection } from "@/modules/email/categories";
import { isProfessionalFieldVisible, type ProfessionalType } from "@/modules/profile/professional";
import { AiSettingsSection } from "./ai-settings-section";
import { EmailCredentialsSection } from "./email-credentials-section";

const LANGUAGES = [
  { value: "", label: "Default (English)" },
  { value: "English", label: "English" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Italian", label: "Italian" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Dutch", label: "Dutch" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Chinese (Simplified)", label: "Chinese (Simplified)" },
  { value: "Chinese (Traditional)", label: "Chinese (Traditional)" },
  { value: "Arabic", label: "Arabic" },
  { value: "Hindi", label: "Hindi" },
  { value: "Russian", label: "Russian" },
  { value: "Turkish", label: "Turkish" },
  { value: "Vietnamese", label: "Vietnamese" },
  { value: "Thai", label: "Thai" },
];

interface SectionConfig {
  key: SectionKey;
  title: string;
  description: string;
  fields: {
    key: string;
    label: string;
    type: "text" | "url" | "select" | "textarea";
    options?: { value: string; label: string }[];
    visibleFor?: ProfessionalType;
    required?: boolean;
  }[];
}

const SECTIONS: SectionConfig[] = [
  {
    key: "personal",
    title: "Personal",
    description: "Your name and contact information",
    fields: [
      { key: "fullName", label: "Full Name", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "location", label: "Location", type: "text" },
    ],
  },
  {
    key: "professional",
    title: "Professional",
    description: "Choose the profile type that best describes you",
    fields: [
      {
        key: "type",
        label: "I am a",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select profile type" },
          { value: "student", label: "Student" },
          { value: "working_professional", label: "Working Professional" },
        ],
      },
      { key: "college", label: "College", type: "text", visibleFor: "student", required: true },
      { key: "degree", label: "Degree", type: "text", visibleFor: "student", required: true },
      { key: "designation", label: "Designation", type: "text", visibleFor: "working_professional", required: true },
      { key: "department", label: "Department", type: "text", visibleFor: "working_professional" },
      { key: "organization", label: "Organization", type: "text", visibleFor: "working_professional", required: true },
    ],
  },
  {
    key: "preferences",
    title: "Writing Preferences",
    description: "How you want your emails to sound",
    fields: [
      {
        key: "formalityLevel",
        label: "Formality Level",
        type: "select",
        options: [
          { value: "formal", label: "Formal" },
          { value: "semi-formal", label: "Semi-Formal" },
          { value: "casual", label: "Casual" },
        ],
      },
      {
        key: "preferredTone",
        label: "Preferred Tone",
        type: "select",
        options: [
          { value: "professional", label: "Professional" },
          { value: "friendly", label: "Friendly" },
          { value: "neutral", label: "Neutral" },
          { value: "warm", label: "Warm" },
          { value: "direct", label: "Direct" },
        ],
      },
      { key: "defaultSignature", label: "Default Signature", type: "textarea" },
      {
        key: "preferredLanguage",
        label: "Preferred Language",
        type: "select",
        options: LANGUAGES,
      },
    ],
  },
  {
    key: "jobApplication",
    title: "Job Application",
    description: "Links used when generating job application emails",
    fields: [
      { key: "resumeUrl", label: "Resume URL", type: "url" },
      { key: "linkedIn", label: "LinkedIn", type: "url" },
      { key: "github", label: "GitHub", type: "url" },
      { key: "portfolio", label: "Portfolio", type: "url" },
    ],
  },
];

function SectionForm({
  section,
  initialData,
  relevant,
}: {
  section: SectionConfig;
  initialData: Record<string, string>;
  relevant: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialData);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const updateMutation = useUpdateProfile();
  const professionalType = values.type as ProfessionalType | undefined;
  const visibleFields = section.fields.filter(
    (field) => isProfessionalFieldVisible(field.visibleFor, professionalType)
  );
  const description = section.key === "professional"
    ? professionalType === "student"
      ? "Your current education details"
      : professionalType === "working_professional"
        ? "Your current work details"
        : section.description
    : section.description;

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setMessage(null);
  }, []);

  async function handleSave() {
    setMessage(null);
    const missingRequired = visibleFields
      .filter((field) => field.required && !values[field.key]?.trim())
      .map((field) => field.label);
    if (missingRequired.length > 0) {
      setMessage({
        type: "error",
        text: `Complete required fields: ${missingRequired.join(", ")}`,
      });
      return;
    }
    try {
      await updateMutation.mutateAsync({ section: section.key, data: values });
      setDirty(false);
      setMessage({ type: "success", text: "Saved successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    }
  }

  return (
    <div
      id={`profile-${section.key}`}
      className={`settings-section ${relevant ? "settings-section--relevant" : ""}`}
    >
      <div className="settings-section__header">
        <h2 className="settings-section__title">{section.title}</h2>
        <p className="settings-section__description">{description}</p>
      </div>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section__fields">
        {visibleFields.map((field) => (
          <div key={field.key} className="settings-field">
            <label
              htmlFor={`${section.key}-${field.key}`}
              className="settings-field__label"
            >
              {field.label}{field.required ? " *" : ""}
            </label>
            {field.type === "select" ? (
              <select
                id={`${section.key}-${field.key}`}
                className="settings-field__select"
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                required={field.required}
              >
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                id={`${section.key}-${field.key}`}
                className="settings-field__textarea"
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                rows={3}
                required={field.required}
              />
            ) : (
              <input
                id={`${section.key}-${field.key}`}
                type={field.type}
                className="settings-field__input"
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>

      {section.key === "professional" && !professionalType && (
        <div className="settings-section__notice">
          Select Student or Working Professional to provide the details used for personalized emails.
        </div>
      )}

      <div className="settings-section__actions">
        <button
          className="settings-section__save"
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

type SectionKey = Exclude<ProfileSection, "resume" | "contactInfo">;

interface ProfileFormProps {
  sections?: SectionKey[];
}

export function ProfileForm({ sections }: ProfileFormProps) {
  const { data, isLoading, isError } = useProfile();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") ?? "";
  const relevantSections = new Set<string>(
    isEmailCategory(categoryParam) ? CATEGORY_POLICIES[categoryParam].profileSections : []
  );

  if (isLoading) {
    return (
      <div className="settings-sections">
        <SkeletonList count={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="settings-message settings-message--error">
        Failed to load profile. Please try again.
      </div>
    );
  }

  const profile = data?.profile;
  const filteredSections = sections
    ? SECTIONS.filter((s) => sections.includes(s.key))
    : SECTIONS;
  return (
    <div className="settings-sections">
      {filteredSections.map((section) => {
        const sectionData = profile
          ? (profile as unknown as Record<string, Record<string, string>>)[section.key] ?? {}
          : {};
        const initial: Record<string, string> = {};
        for (const field of section.fields) {
          initial[field.key] = sectionData[field.key] ?? "";
        }
        return (
          <SectionForm
            key={section.key}
            section={section}
            initialData={initial}
            relevant={relevantSections.has(section.key)}
          />
        );
      })}
      {!sections && <AiSettingsSection />}
      {!sections && <EmailCredentialsSection />}
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/profile-form.tsx
// ============================================================
// PURPOSE: A multi-section settings form for editing the user's personal, professional, preferences, and job application profile data.
// HOW IT WORKS: Loads the profile via useProfile, determines which sections are relevant to the current email category from URL params, and renders a SectionForm for each. Each section tracks local dirty state, validates required fields, and calls useUpdateProfile on save. Also includes AiSettingsSection and EmailCredentialsSection at the bottom.
// PROPS: None (self-contained page component).
// INTEGRATION: useProfile/useUpdateProfile hooks, CATEGORY_POLICIES, isProfessionalFieldVisible, AiSettingsSection, EmailCredentialsSection, SkeletonList.
// ============================================================
