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
// PURPOSE: Utilities for managing student vs working professional profile types.
// HOW IT WORKS: inferProfessionalType() detects the type from data fields (student
//   if college/degree present, working_professional if designation/organization).
//   isProfessionalComplete() checks if required fields for the detected type are
//   filled. normalizeProfessionalForSave() clears irrelevant fields based on type
//   (e.g., clears work fields for students). getActiveProfessionalEntries() returns
//   display-ready entries for UI rendering. isProfessionalFieldVisible() controls
//   field visibility in forms based on selected type.
// INTEGRATION: Used by profile service, context builder, and profile form component
// ============================================================
