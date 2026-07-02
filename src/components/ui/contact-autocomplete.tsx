"use client";

import { useState, useRef, useEffect, useMemo, useCallback, useId } from "react";

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface ContactAutocompleteProps {
  contacts: Contact[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

export function ContactAutocomplete({
  contacts,
  value,
  onChange,
  id,
  className = "",
  placeholder,
  disabled,
  required,
  autoComplete = "off",
}: ContactAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const filtered = useMemo(() => {
    if (!value.trim()) return [];
    const lower = value.trim().toLowerCase();
    return contacts
      .filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower)
      )
      .slice(0, 5);
  }, [contacts, value]);

  const hasResults = filtered.length > 0;

  const showDropdown = open && hasResults;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectContact = useCallback(
    (contact: Contact) => {
      onChange(contact.email);
      setOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  function handleChange(value: string) {
    onChange(value);
    if (!open && value.trim()) {
      setOpen(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectContact(filtered[highlightIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightIndex(-1);
        break;
    }
  }

  return (
    <div ref={wrapperRef} className="contact-autocomplete">
      <input
        ref={inputRef}
        id={id}
        className={`contact-autocomplete__input ${className}`}
        type="email"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (hasResults) setOpen(true);
        }}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlightIndex >= 0 ? `${listboxId}-option-${highlightIndex}` : undefined
        }
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
      />
      {showDropdown && (
        <ul
          id={listboxId}
          className="contact-autocomplete__dropdown"
          role="listbox"
          aria-label="Saved contacts"
        >
          {filtered.map((contact, index) => (
            <li
              key={contact.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === highlightIndex}
              className={`contact-autocomplete__option ${
                index === highlightIndex
                  ? "contact-autocomplete__option--highlighted"
                  : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectContact(contact);
              }}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <span className="contact-autocomplete__option-name">
                {contact.name}
              </span>
              <span className="contact-autocomplete__option-email">
                {contact.email}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/components/ui/contact-autocomplete.tsx
// ============================================================
// PURPOSE: Autocomplete input component for selecting saved contacts by name or email.
// HOW IT WORKS: Wraps a native email input with a dropdown that filters the user's
//   saved contacts by case-insensitive substring match on name or email. Shows up
//   to 5 results. Supports click, keyboard navigation (ArrowUp/ArrowDown/Enter/Escape),
//   and click-outside-to-close. Selected contact populates the input with the email.
// PROPS: contacts (array), value (string), onChange (callback), plus standard input
//   HTML attributes (id, className, placeholder, disabled, required, autoComplete).
// INTEGRATION: Used by recipient input fields across compose, session, batch, and
//   send-email dialog. Contacts data comes from useProfile hook.
// ============================================================
