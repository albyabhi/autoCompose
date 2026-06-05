import { ProfileForm } from "@/features/profile/components/profile-form";
import { ResumeWidget } from "@/features/profile/components/resume-widget";

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <h1 className="settings-page__title">Settings</h1>
      <p className="settings-page__subtitle">
        Your profile is used to personalize AI-generated emails
      </p>
      <ProfileForm />
      <ResumeWidget />
    </div>
  );
}
