export const PROFESSIONAL_TYPES = ["student", "working_professional"] as const;
export type ProfessionalType = (typeof PROFESSIONAL_TYPES)[number];

export interface ProfessionalData {
  type?: ProfessionalType | "";
  designation?: string;
  department?: string;
  organization?: string;
  college?: string;
  degree?: string;
}

const STUDENT_FIELDS = ["college", "degree"] as const;
const WORK_FIELDS = ["designation", "department", "organization"] as const;

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function inferProfessionalType(
  professional?: ProfessionalData | null
): ProfessionalType | undefined {
  if (professional?.type && PROFESSIONAL_TYPES.includes(professional.type as ProfessionalType)) {
    return professional.type as ProfessionalType;
  }

  const hasStudentData = STUDENT_FIELDS.some((field) => hasValue(professional?.[field]));
  const hasWorkData = WORK_FIELDS.some((field) => hasValue(professional?.[field]));

  if (hasStudentData === hasWorkData) return undefined;
  return hasStudentData ? "student" : "working_professional";
}

export function isProfessionalComplete(professional?: ProfessionalData | null): boolean {
  const type = inferProfessionalType(professional);
  if (type === "student") {
    return hasValue(professional?.college) && hasValue(professional?.degree);
  }
  if (type === "working_professional") {
    return hasValue(professional?.designation) && hasValue(professional?.organization);
  }
  return false;
}

export function normalizeProfessionalForSave(professional: ProfessionalData): ProfessionalData {
  const type = professional.type;
  if (type === "student") {
    return {
      type,
      college: professional.college?.trim() ?? "",
      degree: professional.degree?.trim() ?? "",
      designation: "",
      department: "",
      organization: "",
    };
  }

  if (type === "working_professional") {
    return {
      type,
      designation: professional.designation?.trim() ?? "",
      department: professional.department?.trim() ?? "",
      organization: professional.organization?.trim() ?? "",
      college: "",
      degree: "",
    };
  }

  return { ...professional, type: undefined };
}

export function getActiveProfessionalEntries(
  professional?: ProfessionalData | null
): { title: "STUDENT" | "WORKING PROFESSIONAL"; entries: string[] } | null {
  const type = inferProfessionalType(professional);
  if (type === "student") {
    return {
      title: "STUDENT",
      entries: [professional?.degree, professional?.college].filter(Boolean) as string[],
    };
  }
  if (type === "working_professional") {
    return {
      title: "WORKING PROFESSIONAL",
      entries: [
        professional?.designation,
        professional?.department,
        professional?.organization,
      ].filter(Boolean) as string[],
    };
  }
  return null;
}

export function isProfessionalFieldVisible(
  fieldType: ProfessionalType | undefined,
  selectedType: ProfessionalType | undefined
): boolean {
  return !fieldType || fieldType === selectedType;
}

// ============================================================
// FILE: src/modules/profile/professional.ts
// ============================================================
// PURPOSE: Handles the "Student vs Working Professional" distinction in profiles — different fields, different validation, different display.
// HOW IT WORKS: Users can be either a student (college + degree) or working professional (job title + department + company). The type can be set explicitly or inferred from which fields are filled.
//   - inferProfessionalType(): If user explicitly set type, use that. Otherwise auto-detect: if college/degree filled -> student; if designation/organization filled -> working_professional; if both or neither -> undefined (not set).
//   - isProfessionalComplete(): For students, requires both college AND degree. For working professionals, requires both designation AND organization.
//   - normalizeProfessionalForSave(): Before saving to database, clears the irrelevant fields for the selected type (e.g., if student, clears designation/department/organization). Keeps data clean.
//   - getActiveProfessionalEntries(): Returns display-ready data for the AI context builder — title ("STUDENT" or "WORKING PROFESSIONAL") + relevant entries as strings.
//   - isProfessionalFieldVisible(): UI helper — shows/hides form fields based on selected type.
// INTEGRATION: Used by profile service (src/modules/profile/service.ts) when saving, context builder (src/modules/profile/context-builder.ts) for AI context, profile form component (src/features/profile/components/profile-form.tsx), and validation (src/modules/profile/validation.ts).
// ============================================================
