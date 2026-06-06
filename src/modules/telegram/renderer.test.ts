import { describe, it, expect } from "vitest";
import { escapeHtml, chunkText, buildDeepLink, describeCategoryLabel } from "./renderer";

describe("escapeHtml", () => {
  it("escapes all special characters", () => {
    expect(escapeHtml(`<script>alert("xss & 'x'")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss &amp; &#39;x&#39;&quot;)&lt;/script&gt;"
    );
  });

  it("does not touch normal text", () => {
    expect(escapeHtml("Hello world")).toBe("Hello world");
  });
});

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const result = chunkText("short text", 100);
    expect(result).toEqual([{ text: "short text" }]);
  });

  it("splits long text on paragraph boundaries", () => {
    const paragraph = "a".repeat(50);
    const input = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    const chunks = chunkText(input, 80);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(80);
    }
  });

  it("falls back to hard cut when no good boundary", () => {
    const input = "x".repeat(200);
    const chunks = chunkText(input, 80);
    expect(chunks.length).toBe(3);
    expect(chunks[0].text.length).toBeLessThanOrEqual(80);
  });
});

describe("buildDeepLink", () => {
  it("strips a leading @ from the username", () => {
    expect(buildDeepLink("@MyBot", "abc12345")).toBe("https://t.me/MyBot?start=abc12345");
  });

  it("keeps plain username as-is", () => {
    expect(buildDeepLink("MyBot", "abc12345")).toBe("https://t.me/MyBot?start=abc12345");
  });
});

describe("describeCategoryLabel", () => {
  it("converts snake_case to Title Case", () => {
    expect(describeCategoryLabel("job_application")).toBe("Job Application");
    expect(describeCategoryLabel("sick_leave")).toBe("Sick Leave");
  });
});
