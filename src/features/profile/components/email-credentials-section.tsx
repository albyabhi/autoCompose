"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "../hooks/use-profile";
import { setEmailCredentials, removeEmailCredentials } from "../api/profile";

const APP_PASSWORD_HELP_URL =
  "https://support.google.com/accounts/answer/185833";

export function EmailCredentialsSection() {
  const { data, isLoading, isError } = useProfile();
  const queryClient = useQueryClient();

  const storedGmail = data?.profile?.emailCredentials?.gmailAddress ?? "";
  const configured = !!data?.profile?.emailCredentials?.emailConfigured;

  const [gmailAddress, setGmailAddress] = useState(storedGmail);
  const [appPassword, setAppPassword] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const gmailChanged = gmailAddress !== storedGmail;
  const canSave =
    dirty &&
    gmailAddress.trim().length > 0 &&
    appPassword.replace(/\s+/g, "").length === 16;

  async function handleSave() {
    setMessage(null);
    if (!gmailAddress.trim()) {
      setMessage({ type: "error", text: "Gmail address is required" });
      return;
    }
    if (appPassword.replace(/\s+/g, "").length !== 16) {
      setMessage({
        type: "error",
        text: "App password must be 16 characters (Google App Password format)",
      });
      return;
    }
    setSaving(true);
    try {
      await setEmailCredentials({ gmailAddress: gmailAddress.trim(), appPassword });
      setAppPassword("");
      setDirty(false);
      setMessage({ type: "success", text: "Credentials saved" });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Remove Gmail credentials? You'll need to re-add them to send emails."
      );
      if (!ok) return;
    }
    setMessage(null);
    setRemoving(true);
    try {
      await removeEmailCredentials();
      setGmailAddress("");
      setAppPassword("");
      setDirty(false);
      setMessage({ type: "success", text: "Credentials removed" });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove",
      });
    } finally {
      setRemoving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="settings-section">
        <div className="settings-section__header">
          <h2 className="settings-section__title">Email Credentials</h2>
          <p className="settings-section__description">Loading email credentials...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="settings-section">
        <div className="settings-section__header">
          <h2 className="settings-section__title">Email Credentials</h2>
        </div>
        <div className="settings-message settings-message--error">
          Failed to load email credentials.
        </div>
      </div>
    );
  }

  return (
    <div
      id="profile-email-credentials"
      className="settings-section"
    >
      <div className="settings-section__header">
        <div className="settings-section__title-row">
          <h2 className="settings-section__title">Email Credentials</h2>
          {configured ? (
            <span
              className="settings-badge settings-badge--success"
              role="status"
              aria-label="Email credentials configured"
            >
              Connected
            </span>
          ) : (
            <span
              className="settings-badge settings-badge--muted"
              role="status"
              aria-label="Email credentials not configured"
            >
              Not connected
            </span>
          )}
        </div>
        <p className="settings-section__description">
          Connect your Gmail account to send generated emails directly from AutoCompose.
          Credentials are encrypted at rest and never returned by the API.
        </p>
      </div>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section__fields">
        <Input
          id="email-credentials-gmail"
          name="gmailAddress"
          type="email"
          label="Gmail address"
          placeholder="arjun@gmail.com"
          autoComplete="email"
          value={gmailAddress}
          onChange={(e) => {
            setGmailAddress(e.target.value);
            setDirty(true);
            setMessage(null);
          }}
        />

        <div className="field-group">
          <label htmlFor="email-credentials-app-password" className="field-label">
            App password
          </label>
          <input
            id="email-credentials-app-password"
            name="appPassword"
            type="password"
            className="field-input"
            placeholder="••••••••••••••••"
            autoComplete="new-password"
            value={appPassword}
            onChange={(e) => {
              setAppPassword(e.target.value);
              setDirty(true);
              setMessage(null);
            }}
          />
          <p className="field-hint">
            Generate at{" "}
            <a
              href={APP_PASSWORD_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account → Security → App Passwords ↗
            </a>
            . Not your Gmail password. Requires 2-Step Verification to be enabled.
          </p>
        </div>

        {configured && (
          <p className="settings-section__notice">
            Connected as <strong>{storedGmail}</strong>. The password is stored encrypted
            and is not shown again — enter a new password above to rotate it.
            {gmailChanged && " Saving will also update the Gmail address above."}
          </p>
        )}
      </div>

      <div className="settings-section__actions">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!canSave || saving}
          loading={saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        {configured && (
          <Button
            variant="danger"
            onClick={handleRemove}
            disabled={removing || saving}
            loading={removing}
          >
            {removing ? "Removing..." : "Remove"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/email-credentials-section.tsx
// ============================================================
// PURPOSE: Settings section for connecting or disconnecting a Gmail account via Google App Password.
// HOW IT works: Shows a connected/not-connected badge, an email input, and a masked app-password input. Validates that the app password is exactly 16 characters. On save, calls setEmailCredentials API; on remove, calls removeEmailCredentials API. Invalidates the profile query cache after each action.
// PROPS: None (self-contained settings section).
// INTEGRATION: useProfile hook, setEmailCredentials/removeEmailCredentials API, Button, Input UI components, queryClient.
// ============================================================
