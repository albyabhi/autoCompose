"use client";

import { useResume, useUploadResume, useDeleteResume } from "../hooks/use-resume";
import { useProfile } from "../hooks/use-profile";
import { useState, useRef } from "react";
import type { ResumeData } from "../api/resume";
import { useSearchParams } from "next/navigation";
import { CATEGORY_POLICIES, isEmailCategory } from "@/modules/email/categories";
import { MODEL_IDS_KEYS, MODEL_LABELS, type ModelId } from "@/modules/ai/types";

function ViewModal({
  resume,
  onClose,
}: {
  resume: ResumeData;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"skills" | "education" | "experience" | "projects">("skills");

  return (
    <div className="resume-modal-backdrop" onClick={onClose}>
      <div className="resume-modal" onClick={(e) => e.stopPropagation()}>
        <div className="resume-modal__header">
          <h2 className="resume-modal__title">Parsed Resume</h2>
          <button className="resume-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {resume.name && (
          <div className="resume-modal__contact">
            <strong>{resume.name}</strong>
            {resume.email && <span> · {resume.email}</span>}
            {resume.phone && <span> · {resume.phone}</span>}
          </div>
        )}

        <div className="resume-modal__tabs">
          <button
            className={`resume-modal__tab ${tab === "skills" ? "resume-modal__tab--active" : ""}`}
            onClick={() => setTab("skills")}
          >
            Skills ({resume.skills.length})
          </button>
          <button
            className={`resume-modal__tab ${tab === "education" ? "resume-modal__tab--active" : ""}`}
            onClick={() => setTab("education")}
          >
            Education ({resume.education.length})
          </button>
          <button
            className={`resume-modal__tab ${tab === "experience" ? "resume-modal__tab--active" : ""}`}
            onClick={() => setTab("experience")}
          >
            Experience ({resume.experience.length})
          </button>
          <button
            className={`resume-modal__tab ${tab === "projects" ? "resume-modal__tab--active" : ""}`}
            onClick={() => setTab("projects")}
          >
            Projects ({resume.projects?.length ?? 0})
          </button>
        </div>

        <div className="resume-modal__body">
          {tab === "skills" && (
            <div className="resume-modal__skills">
              {resume.skills.length === 0 ? (
                <p className="resume-modal__empty">No skills detected</p>
              ) : (
                <div className="resume-tags">
                  {resume.skills.map((skill, i) => (
                    <span key={i} className="resume-tag">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "education" && (
            <div className="resume-modal__list">
              {resume.education.length === 0 ? (
                <p className="resume-modal__empty">No education entries</p>
              ) : (
                resume.education.map((edu, i) => (
                  <div key={i} className="resume-entry">
                    <h4 className="resume-entry__title">{edu.degree}</h4>
                    {edu.institution && (
                      <p className="resume-entry__sub">{edu.institution}</p>
                    )}
                    {edu.year && (
                      <p className="resume-entry__meta">{edu.year}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "experience" && (
            <div className="resume-modal__list">
              {resume.experience.length === 0 ? (
                <p className="resume-modal__empty">No experience entries</p>
              ) : (
                resume.experience.map((exp, i) => (
                  <div key={i} className="resume-entry">
                    <h4 className="resume-entry__title">{exp.company}</h4>
                    {exp.role && <p className="resume-entry__sub">{exp.role}</p>}
                    {exp.duration && (
                      <p className="resume-entry__meta">{exp.duration}</p>
                    )}
                    {exp.description && (
                      <p className="resume-entry__desc">{exp.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "projects" && (
            <div className="resume-modal__list">
              {(!resume.projects || resume.projects.length === 0) ? (
                <p className="resume-modal__empty">No projects detected</p>
              ) : (
                resume.projects.map((proj, i) => (
                  <div key={i} className="resume-entry">
                    <h4 className="resume-entry__title">{proj.name}</h4>
                    {proj.description && (
                      <p className="resume-entry__desc">{proj.description}</p>
                    )}
                    {proj.url && (
                      <p className="resume-entry__meta">{proj.url}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResumeWidget() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const relevant = isEmailCategory(category) && CATEGORY_POLICIES[category].profileSections.includes("resume");
  const { data, isLoading, isError } = useResume();
  const { data: profileData } = useProfile();
  const uploadMutation = useUploadResume();
  const deleteMutation = useDeleteResume();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progressInfo, setProgressInfo] = useState<{ percent: number; text: string } | null>(null);
  const [modelId, setModelId] = useState<ModelId>("deepseek");
  const [userTouchedModel, setUserTouchedModel] = useState(false);

  const storedPreferred = profileData?.profile?.preferences?.preferredModel;
  const effectiveModelId =
    !userTouchedModel &&
    typeof storedPreferred === "string" &&
    (MODEL_IDS_KEYS as readonly string[]).includes(storedPreferred)
      ? (storedPreferred as ModelId)
      : modelId;

  const handleModelChange = (next: ModelId) => {
    setUserTouchedModel(true);
    setModelId(next);
  };

  const resume = data?.resume;

  const handleFile = async (file: File) => {
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      alert("Please upload a PDF, DOCX, or TXT file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB.");
      return;
    }
    
    setProgressInfo({ percent: 0, text: "Initializing..." });
    uploadMutation.mutate(
      { 
        file,
        modelId: effectiveModelId,
        onProgress: (percent, text) => setProgressInfo({ percent, text }) 
      },
      {
        onSettled: () => setProgressInfo(null)
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handlePick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleRemove = () => {
    if (confirm("Remove parsed resume data?")) {
      deleteMutation.mutate();
    }
  };

  const isBusy = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <div id="profile-resume" className={`settings-section ${relevant ? "settings-section--relevant" : ""}`}>
      <div className="settings-section__header">
        <h2 className="settings-section__title">Resume</h2>
        <p className="settings-section__description">
          Upload your resume to auto-fill skills, education, and experience
        </p>
      </div>

      {isLoading && (
        <div className="resume-widget__loading">Loading resume data...</div>
      )}

      {isError && (
        <div className="settings-message settings-message--error">
          Failed to load resume data
        </div>
      )}

      {uploadMutation.isPending && (
        <div className="resume-progress" style={{ margin: "1rem 0" }}>
          {progressInfo ? (
            <>
              <div style={{ width: "100%", backgroundColor: "#e8e6e1", height: "12px", borderRadius: "6px", overflow: "hidden", border: "2px solid #000" }}>
                <div style={{ width: `${progressInfo.percent}%`, backgroundColor: "#ffd700", height: "100%", transition: "width 0.3s ease-in-out", borderRight: "2px solid #000" }} />
              </div>
              <p className="settings-message settings-message--success" style={{ marginTop: "0.5rem" }}>
                {progressInfo.text} ({progressInfo.percent}%)
              </p>
            </>
          ) : (
            <div className="settings-message settings-message--success">
              Parsing resume with AI...
            </div>
          )}
        </div>
      )}

      {uploadMutation.isError && (
        <div className="settings-message settings-message--error">
          {(uploadMutation.error as Error)?.message ?? "Failed to upload resume"}
        </div>
      )}

      {deleteMutation.isError && (
        <div className="settings-message settings-message--error">
          {(deleteMutation.error as Error)?.message ?? "Failed to remove resume"}
        </div>
      )}

      {!isLoading && !uploadMutation.isPending && !resume && (
        <div
          className={`resume-upload ${dragOver ? "resume-upload--dragover" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="resume-upload__icon">📄</div>
          <p className="resume-upload__text">
            Drag & drop your resume here, or click to browse
          </p>
          <p className="resume-upload__hint">PDF, DOCX, or TXT (max 10MB)</p>
          <div className="field-group resume-upload__model">
            <label htmlFor="resume-model-select" className="field-label">
              AI Model
            </label>
            <select
              id="resume-model-select"
              className="field-select"
              value={effectiveModelId}
              onChange={(e) => handleModelChange(e.target.value as ModelId)}
              disabled={isBusy}
            >
              {Object.entries(MODEL_LABELS).map(([id, { name, description }]) => (
                <option key={id} value={id} title={description}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="settings-section__save"
            onClick={handlePick}
            disabled={isBusy}
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="resume-upload__input"
            onChange={handleFileChange}
          />
        </div>
      )}

      {!isLoading && resume && (
        <div className="resume-summary">
          {resume.name && (
            <div className="resume-summary__contact">
              <strong>{resume.name}</strong>
              {resume.email && <span> · {resume.email}</span>}
              {resume.phone && <span> · {resume.phone}</span>}
            </div>
          )}

          <div className="resume-summary__stats">
            <div className="resume-summary__stat">
              <span className="resume-summary__stat-value">{resume.skills.length}</span>
              <span className="resume-summary__stat-label">Skills</span>
            </div>
            <div className="resume-summary__stat">
              <span className="resume-summary__stat-value">{resume.education.length}</span>
              <span className="resume-summary__stat-label">Education</span>
            </div>
            <div className="resume-summary__stat">
              <span className="resume-summary__stat-value">{resume.experience.length}</span>
              <span className="resume-summary__stat-label">Experience</span>
            </div>
            <div className="resume-summary__stat">
              <span className="resume-summary__stat-value">{resume.projects?.length ?? 0}</span>
              <span className="resume-summary__stat-label">Projects</span>
            </div>
          </div>

          {resume.skills.length > 0 && (
            <div className="resume-tags">
              {resume.skills.slice(0, 8).map((s, i) => (
                <span key={i} className="resume-tag">{s}</span>
              ))}
              {resume.skills.length > 8 && (
                <span className="resume-tag resume-tag--more">
                  +{resume.skills.length - 8} more
                </span>
              )}
            </div>
          )}

          <div className="resume-summary__actions">
            <button
              className="settings-section__save"
              onClick={() => setShowModal(true)}
              disabled={isBusy}
            >
              View
            </button>
            <button
              className="resume-summary__remove"
              onClick={handleRemove}
              disabled={isBusy}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      )}

      {showModal && resume && (
        <ViewModal resume={resume} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/resume-widget.tsx
// ============================================================
// PURPOSE: Upload, view, and manage a parsed resume with drag-and-drop support and AI model selection.
// HOW IT works: Displays a drag-and-drop upload zone when no resume exists, allowing the user to pick an AI model and upload a PDF/DOCX/TXT file. Upload progress is streamed via onProgress. When a resume is present, shows a summary with skill tags and stats, and a ViewModal with tabs for skills, education, experience, and projects. Also supports removing the resume.
// PROPS: None (self-contained widget).
// INTEGRATION: useResume/useUploadResume/useDeleteResume hooks, useProfile (for preferred model), MODEL_LABELS/MODEL_IDS_KEYS, CATEGORY_POLICIES.
// ============================================================
