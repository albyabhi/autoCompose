"use client";

import { useProfile, useUpdateProfile } from "../hooks/use-profile";
import { useState, useEffect, useCallback } from "react";
import { SkeletonList } from "@/components/ui/skeleton";

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
  key: string;
  title: string;
  description: string;
  fields: {
    key: string;
    label: string;
    type: "text" | "url" | "select" | "textarea";
    options?: { value: string; label: string }[];
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
    description: "Your work and education details",
    fields: [
      { key: "designation", label: "Designation", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "organization", label: "Organization", type: "text" },
      { key: "college", label: "College", type: "text" },
      { key: "degree", label: "Degree", type: "text" },
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
      { key: "portfolio", label: "Portfolio", type: "url" },
    ],
  },
];

function SectionForm({
  section,
  initialData,
}: {
  section: SectionConfig;
  initialData: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialData);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const updateMutation = useUpdateProfile();

  useEffect(() => {
    setValues(initialData);
    setDirty(false);
  }, [initialData]);

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setMessage(null);
  }, []);

  async function handleSave() {
    setMessage(null);
    try {
      await updateMutation.mutateAsync({ section: section.key, data: values });
      setDirty(false);
      setMessage({ type: "success", text: "Saved successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">{section.title}</h2>
        <p className="settings-section__description">{section.description}</p>
      </div>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section__fields">
        {section.fields.map((field) => (
          <div key={field.key} className="settings-field">
            <label
              htmlFor={`${section.key}-${field.key}`}
              className="settings-field__label"
            >
              {field.label}
            </label>
            {field.type === "select" ? (
              <select
                id={`${section.key}-${field.key}`}
                className="settings-field__select"
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
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
              />
            ) : (
              <input
                id={`${section.key}-${field.key}`}
                type={field.type}
                className="settings-field__input"
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

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

export function ProfileForm() {
  const { data, isLoading, isError } = useProfile();

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
  const emptyRecord: Record<string, string> = {};

  return (
    <div className="settings-sections">
      {SECTIONS.map((section) => {
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
          />
        );
      })}
    </div>
  );
}
