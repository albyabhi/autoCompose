"use client";

import { useState } from "react";
import { useProfile, useUpdateProfile } from "../hooks/use-profile";
import { MODEL_IDS_KEYS, MODEL_LABELS, DEFAULT_MODEL_ID, type ModelId } from "@/modules/ai/types";

function isValidModelId(value: unknown): value is ModelId {
  return typeof value === "string" && (MODEL_IDS_KEYS as readonly string[]).includes(value);
}

export function AiSettingsSection() {
  const { data, isLoading, isError } = useProfile();
  const updateMutation = useUpdateProfile();

  const storedPreferred = data?.profile?.preferences?.preferredModel;
  const initial: ModelId = isValidModelId(storedPreferred) ? storedPreferred : DEFAULT_MODEL_ID;

  const [selected, setSelected] = useState<ModelId>(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const effectiveSelected =
    !dirty && isValidModelId(storedPreferred) ? storedPreferred : selected;

  const handleChange = (value: ModelId) => {
    setSelected(value);
    setDirty(true);
    setMessage(null);
  };

  async function handleSave() {
    setMessage(null);
    try {
      await updateMutation.mutateAsync({
        section: "preferences",
        data: { preferredModel: selected },
      });
      setDirty(false);
      setMessage({ type: "success", text: "Saved successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    }
  }

  if (isLoading) {
    return (
      <div className="settings-section">
        <div className="settings-section__header">
          <h2 className="settings-section__title">AI Settings</h2>
          <p className="settings-section__description">Loading AI preferences...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="settings-section">
        <div className="settings-section__header">
          <h2 className="settings-section__title">AI Settings</h2>
        </div>
        <div className="settings-message settings-message--error">
          Failed to load AI preferences.
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">AI Settings</h2>
        <p className="settings-section__description">
          Choose the default AI model used for email composition and resume parsing. You can still
          override this choice per action.
        </p>
      </div>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section__fields">
        <div className="settings-field">
          <label htmlFor="preferred-model" className="settings-field__label">
            Preferred AI Model
          </label>
          <select
            id="preferred-model"
            className="settings-field__select"
            value={effectiveSelected}
            onChange={(e) => handleChange(e.target.value as ModelId)}
          >
            {Object.entries(MODEL_LABELS).map(([id, { name, description }]) => (
              <option key={id} value={id} title={description}>
                {name}
              </option>
            ))}
          </select>
        </div>
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

// ============================================================
// FILE: src/features/profile/components/ai-settings-section.tsx
// ============================================================
// PURPOSE: Settings section for selecting the default AI model used for email composition and resume parsing.
// HOW IT works: Reads the stored preferredModel from the profile, displays a dropdown of MODEL_LABELS, and tracks local dirty state. On save, calls useUpdateProfile with the preferences section. Falls back to DEFAULT_MODEL_ID if no valid model is stored.
// PROPS: None (self-contained settings section).
// INTEGRATION: useProfile/useUpdateProfile hooks, MODEL_IDS_KEYS/MODEL_LABELS/ModelId from @/modules/ai/types.
// ============================================================
