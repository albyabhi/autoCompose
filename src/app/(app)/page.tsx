import { Suspense } from "react";
import { GenerateForm } from "@/components/generate-form";

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GenerateForm />
    </Suspense>
  );
}
