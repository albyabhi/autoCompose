"use client";

import { useRef, useState, useCallback } from "react";
import { validateAttachments, formatFileSize } from "@/utils/attachments";

interface AttachmentUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  label?: string;
}

export function AttachmentUpload({
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 20,
  label = "Attachments",
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const newList = Array.from(incoming);
      const combined = [...files, ...newList];

      if (combined.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`);
        return;
      }

      const validation = validateAttachments(combined);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      setError(null);
      onFilesChange(combined);
    },
    [files, maxFiles, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      setError(null);
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  function handleBrowse() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className={`attachment-upload ${disabled ? "attachment-upload--disabled" : ""}`}>
      <label className="attachment-upload__label">{label}</label>

      <div
        className={`attachment-upload__dropzone ${dragOver ? "attachment-upload__dropzone--active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleBrowse(); }}
        aria-label="Add attachments"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="attachment-upload__input"
          onChange={handleInputChange}
          disabled={disabled}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.docx,.txt,.csv,application/pdf,image/jpeg,image/png,image/gif,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
        />
        <span className="attachment-upload__icon">📎</span>
        <span className="attachment-upload__text">
          {dragOver ? "Drop files here" : "Click or drag files to attach"}
        </span>
        <span className="attachment-upload__hint">PDF, images, DOCX, TXT, CSV (up to 10 MB each)</span>
      </div>

      {error && <div className="attachment-upload__error">{error}</div>}

      {files.length > 0 && (
        <div className="attachment-upload__list">
          <div className="attachment-upload__summary">
            {files.length} file{files.length !== 1 ? "s" : ""} · {formatFileSize(totalSize)}
          </div>
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="attachment-upload__chip">
              <span className="attachment-upload__chip-icon">📄</span>
              <span className="attachment-upload__chip-name">{file.name}</span>
              <span className="attachment-upload__chip-size">{formatFileSize(file.size)}</span>
              <button
                type="button"
                className="attachment-upload__chip-remove"
                onClick={() => removeFile(i)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
