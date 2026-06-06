import { describe, expect, it } from "vitest";
import {
  getActiveProfessionalEntries,
  inferProfessionalType,
  isProfessionalComplete,
  isProfessionalFieldVisible,
  normalizeProfessionalForSave,
} from "./professional";
import { professionalSchema } from "./validation";

describe("professional profile types", () => {
  it("validates and normalizes a student profile", () => {
    const result = professionalSchema.parse({
      type: "student",
      college: " University ",
      degree: " Computer Science ",
      designation: "Old role",
      organization: "Old company",
    });
    expect(result).toEqual({
      type: "student",
      college: "University",
      degree: "Computer Science",
      designation: "",
      department: "",
      organization: "",
    });
  });

  it("validates and normalizes a working professional profile", () => {
    const result = professionalSchema.parse({
      type: "working_professional",
      designation: " Engineer ",
      organization: " Company ",
      department: "Platform",
      college: "Old college",
      degree: "Old degree",
    });
    expect(result).toEqual({
      type: "working_professional",
      designation: "Engineer",
      department: "Platform",
      organization: "Company",
      college: "",
      degree: "",
    });
  });

  it("requires core fields for the selected type", () => {
    expect(professionalSchema.safeParse({ type: "student", college: "", degree: "" }).success).toBe(false);
    expect(professionalSchema.safeParse({
      type: "working_professional",
      designation: "",
      organization: "",
    }).success).toBe(false);
  });

  it("infers unambiguous legacy profiles and leaves mixed or empty profiles unset", () => {
    expect(inferProfessionalType({ college: "College", degree: "Degree" })).toBe("student");
    expect(inferProfessionalType({ designation: "Engineer", organization: "Company" })).toBe("working_professional");
    expect(inferProfessionalType({ college: "College", organization: "Company" })).toBeUndefined();
    expect(inferProfessionalType({})).toBeUndefined();
  });

  it("clears inactive fields when switching types", () => {
    expect(normalizeProfessionalForSave({
      type: "student",
      college: "College",
      degree: "Degree",
      designation: "Engineer",
      organization: "Company",
    })).toMatchObject({ designation: "", organization: "" });
    expect(normalizeProfessionalForSave({
      type: "working_professional",
      designation: "Engineer",
      organization: "Company",
      college: "College",
      degree: "Degree",
    })).toMatchObject({ college: "", degree: "" });
  });

  it("uses active branch rules for completeness, context, and field visibility", () => {
    expect(isProfessionalComplete({ type: "student", college: "College", degree: "Degree" })).toBe(true);
    expect(isProfessionalComplete({ type: "student", college: "College" })).toBe(false);
    expect(getActiveProfessionalEntries({
      type: "student",
      college: "College",
      degree: "Degree",
      organization: "Hidden company",
    })).toEqual({ title: "STUDENT", entries: ["Degree", "College"] });
    expect(isProfessionalFieldVisible("student", "student")).toBe(true);
    expect(isProfessionalFieldVisible("working_professional", "student")).toBe(false);
    expect(isProfessionalFieldVisible(undefined, undefined)).toBe(true);
  });
});
