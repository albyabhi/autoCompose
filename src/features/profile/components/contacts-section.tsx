"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "../hooks/use-profile";
import { updateContacts } from "../api/profile";

interface ContactForm {
  name: string;
  email: string;
}

const emptyForm: ContactForm = { name: "", email: "" };

export function ContactsSection() {
  const { data, isLoading, isError } = useProfile();
  const queryClient = useQueryClient();

  const contacts = data?.profile?.contacts ?? [];
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = useCallback((field: keyof ContactForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }, []);

  function validate(): string | null {
    if (!form.name.trim()) return "Name is required";
    if (form.name.trim().length > 100) return "Name cannot exceed 100 characters";
    if (!form.email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) return "Invalid email address";
    if (form.email.trim().length > 320) return "Email too long";
    return null;
  }

  async function handleSave() {
    const error = validate();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setSaving(true);
    try {
      let updatedContacts;
      if (editingId) {
        updatedContacts = contacts.map((c) =>
          c.id === editingId
            ? { ...c, name: form.name.trim(), email: form.email.trim().toLowerCase() }
            : c
        );
      } else {
        const newContact = {
          id: crypto.randomUUID(),
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
        };
        updatedContacts = [...contacts, newContact];
      }

      await updateContacts(updatedContacts);
      setForm(emptyForm);
      setEditingId(null);
      setMessage({ type: "success", text: editingId ? "Contact updated" : "Contact added" });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save contact",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(contact: { id: string; name: string; email: string }) {
    setForm({ name: contact.name, email: contact.email });
    setEditingId(contact.id);
    setMessage(null);
  }

  function handleCancelEdit() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage(null);
  }

  async function handleDelete(id: string) {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Remove this contact?");
      if (!ok) return;
    }

    setSaving(true);
    try {
      const updatedContacts = contacts.filter((c) => c.id !== id);
      await updateContacts(updatedContacts);
      if (editingId === id) {
        setForm(emptyForm);
        setEditingId(null);
      }
      setMessage({ type: "success", text: "Contact removed" });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove contact",
      });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="settings-section">
        <div className="settings-section__header">
          <h2 className="settings-section__title">My Contacts</h2>
          <p className="settings-section__description">Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="settings-section">
        <div className="settings-section__header">
          <h2 className="settings-section__title">My Contacts</h2>
        </div>
        <div className="settings-message settings-message--error">
          Failed to load contacts.
        </div>
      </div>
    );
  }

  return (
    <div id="profile-contacts" className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__title-row">
          <h2 className="settings-section__title">My Contacts</h2>
          <span
            className={`settings-badge ${contacts.length > 0 ? "settings-badge--success" : "settings-badge--muted"}`}
            role="status"
            aria-label={`${contacts.length} contacts saved`}
          >
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="settings-section__description">
          Save frequently used contacts for quick access when composing emails.
          Start typing a name or email in the recipient field to autocomplete.
        </p>
      </div>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section__fields">
        <Input
          id="contact-name"
          name="name"
          type="text"
          label="Name"
          placeholder="John Doe"
          autoComplete="off"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
        <Input
          id="contact-email"
          name="email"
          type="email"
          label="Email"
          placeholder="john@example.com"
          autoComplete="off"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
      </div>

      <div className="settings-section__actions">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || !form.name.trim() || !form.email.trim()}
          loading={saving}
        >
          {saving ? "Saving..." : editingId ? "Update Contact" : "Add Contact"}
        </Button>
        {editingId && (
          <Button variant="ghost" onClick={handleCancelEdit} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>

      {contacts.length > 0 && (
        <div className="settings-section__list">
          <h3 className="settings-section__list-title">Saved Contacts</h3>
          {contacts.map((contact) => (
            <div key={contact.id} className="settings-list-item">
              <div className="settings-list-item__info">
                <span className="settings-list-item__name">{contact.name}</span>
                <span className="settings-list-item__detail">{contact.email}</span>
              </div>
              <div className="settings-list-item__actions">
                <button
                  className="settings-list-item__btn settings-list-item__btn--edit"
                  onClick={() => handleEdit(contact)}
                  disabled={saving}
                  aria-label={`Edit ${contact.name}`}
                >
                  Edit
                </button>
                <button
                  className="settings-list-item__btn settings-list-item__btn--delete"
                  onClick={() => handleDelete(contact.id)}
                  disabled={saving}
                  aria-label={`Delete ${contact.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/contacts-section.tsx
// ============================================================
// PURPOSE: Settings section for managing saved contacts (name + email pairs).
// HOW IT WORKS: Displays existing contacts with edit/delete controls. Provides
//   an inline form to add new contacts or edit existing ones. Validates inputs
//   before saving. Uses crypto.randomUUID() for contact IDs. Persists via the
//   profile API (PATCH /api/profile with contacts array).
// PROPS: None (self-contained settings section).
// INTEGRATION: useProfile hook, updateContacts API, Button and Input UI components.
// ============================================================
