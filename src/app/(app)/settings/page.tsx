"use client";

import { ProfileForm } from "@/features/profile/components/profile-form";
import { AiSettingsSection } from "@/features/profile/components/ai-settings-section";
import { EmailCredentialsSection } from "@/features/profile/components/email-credentials-section";
import { ResumeWidget } from "@/features/profile/components/resume-widget";
import { TelegramCard } from "@/components/settings/telegram-card";
import { ClearSessionsCard } from "@/components/settings/clear-sessions-card";
import { Tabs, TabsList, TabTrigger, TabContent } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <h1 className="settings-page__title">Settings</h1>
      <p className="settings-page__subtitle">
        Your profile is used to personalize AI-generated emails
      </p>
      <Tabs
        defaultValue="personal"
        labels={{
          personal: "Personal",
          writing: "Writing",
          ai: "AI Settings",
          email: "Email",
          integrations: "Integrations",
          resume: "Resume",
          sessions: "Sessions",
        }}
      >
        <TabsList>
          <TabTrigger value="personal">Personal</TabTrigger>
          <TabTrigger value="writing">Writing</TabTrigger>
          <TabTrigger value="ai">AI</TabTrigger>
          <TabTrigger value="email">Email</TabTrigger>
          <TabTrigger value="integrations">Integrations</TabTrigger>
          <TabTrigger value="resume">Resume</TabTrigger>
          <TabTrigger value="sessions">Sessions</TabTrigger>
        </TabsList>
        <TabContent value="personal">
          <ProfileForm sections={["personal", "professional"]} />
        </TabContent>
        <TabContent value="writing">
          <ProfileForm sections={["preferences", "jobApplication"]} />
        </TabContent>
        <TabContent value="ai">
          <AiSettingsSection />
        </TabContent>
        <TabContent value="email">
          <EmailCredentialsSection />
        </TabContent>
        <TabContent value="integrations">
          <TelegramCard />
        </TabContent>
        <TabContent value="resume">
          <ResumeWidget />
        </TabContent>
        <TabContent value="sessions">
          <ClearSessionsCard />
        </TabContent>
      </Tabs>
    </div>
  );
}
