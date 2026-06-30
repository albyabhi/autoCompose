"use client";

import { ResumeEditorForm } from "@/features/profile/components/resume-editor-form";

export default function ResumeEditPage() {
  return (
    <div className="resume-editor-page">
      <div className="resume-editor-page__header">
        <h1 className="resume-editor-page__title">Edit Resume</h1>
        <p className="resume-editor-page__subtitle">
          Review and edit the parsed resume data from your upload
        </p>
      </div>
      <ResumeEditorForm />
    </div>
  );
}

// ============================================================
// FILE: src/app/(app)/settings/resume/edit/page.tsx
// ============================================================
// PURPOSE: Route page for editing parsed resume data.
// HOW IT WORKS: Renders a header with title and subtitle, then the ResumeEditorForm
//   which handles all data fetching, local state, sections, and save/cancel.
// INTEGRATION: ResumeEditorForm component
// ============================================================
