import { Suspense } from "react";
import { GenerateForm } from "@/components/generate-form";

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GenerateForm />
    </Suspense>
  );
}

// ============================================================
// FILE: src/app/(app)/page.tsx
// ============================================================
// PURPOSE: Home page — displays the email generation form.
// HOW IT WORKS: Server component that renders GenerateForm wrapped in Suspense.
//   The Suspense boundary provides a loading fallback while the client-side form
//   hydrates and fetches user profile data. This is the main landing page after
//   authentication.
// INTEGRATION: GenerateForm component
// ============================================================
