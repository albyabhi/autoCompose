import { describe, expect, it } from "vitest";
import { extractSubject, parseEmailContent, stripSubjectLine } from "./content";

describe("parseEmailContent", () => {
  it("extracts the subject when the first line is 'Subject: ...'", () => {
    const content = "Subject: Leave request for next week\n\nHi Manager,\n\nPlease consider my leave.\n";
    expect(parseEmailContent(content)).toEqual({
      subject: "Leave request for next week",
      body: "Hi Manager,\n\nPlease consider my leave.",
    });
  });

  it("matches 'Subject:' case-insensitively and trims whitespace", () => {
    const content = "subject:   Q3 Planning Notes  \n\nHello team,\n\nHere are the notes.\n";
    const parsed = parseEmailContent(content);
    expect(parsed.subject).toBe("Q3 Planning Notes");
    expect(parsed.body).toBe("Hello team,\n\nHere are the notes.");
  });

  it("uses the first non-empty line as the subject when no 'Subject:' prefix", () => {
    const content = "Quick question about the design doc\n\nHey,\n\nCould you share the latest version?\n";
    const parsed = parseEmailContent(content);
    expect(parsed.subject).toBe("Quick question about the design doc");
    expect(parsed.body).toBe("Hey,\n\nCould you share the latest version?");
  });

  it("strips a leading blank line after the subject line", () => {
    const content = "Subject: Hi\n\n\nBody starts here.\n";
    const parsed = parseEmailContent(content);
    expect(parsed.subject).toBe("Hi");
    expect(parsed.body.startsWith("Body starts here.")).toBe(true);
  });

  it("falls back to a default subject when content is empty", () => {
    const parsed = parseEmailContent("");
    expect(parsed.subject).toBe("Email from AutoCompose");
    expect(parsed.body).toBe("");
  });

  it("caps the subject at 200 characters", () => {
    const long = "a".repeat(500);
    const parsed = parseEmailContent(`Subject: ${long}\n\nBody.`);
    expect(parsed.subject.length).toBe(200);
  });

  it("does not mutate the original content's subject line when used as the first-line fallback", () => {
    const content = "Just the body — no subject line marker at all.\nMore body.\n";
    const parsed = parseEmailContent(content);
    expect(parsed.subject).toBe("Just the body — no subject line marker at all.");
  });

  it("stripSubjectLine removes only the first subject marker and one blank line", () => {
    const content = "Subject: Hello\n\nBody one.\n\nSubject: This is body text, not a header\n";
    expect(stripSubjectLine(content)).toBe(
      "Body one.\n\nSubject: This is body text, not a header"
    );
  });

  it("extractSubject returns 'Email from AutoCompose' for whitespace-only input", () => {
    expect(extractSubject("   \n  \n")).toBe("Email from AutoCompose");
  });
});
