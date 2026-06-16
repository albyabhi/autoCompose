import { ProfileForm } from "@/features/profile/components/profile-form";
import { ResumeWidget } from "@/features/profile/components/resume-widget";
import { TelegramCard } from "@/components/settings/telegram-card";

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <h1 className="settings-page__title">Settings</h1>
      <p className="settings-page__subtitle">
        Your profile is used to personalize AI-generated emails
      </p>
      <TelegramCard />
      <ProfileForm />
      <ResumeWidget />
    </div>
  );
}

// ============================================================
// FILE: src/app/(app)/settings/page.tsx
// ============================================================
// PURPOSE: Settings page — displays Telegram linking, profile form, and resume upload.
// HOW IT WORKS: Server component that renders three main sections: TelegramCard
//   (link/unlink Telegram account), ProfileForm (personal info, professional
//   details, writing preferences, job application links), and ResumeWidget
//   (upload/parse/delete resume). Profile data flows to the AI to personalize
//   generated emails.
// INTEGRATION: TelegramCard, ProfileForm, ResumeWidget
// ============================================================
