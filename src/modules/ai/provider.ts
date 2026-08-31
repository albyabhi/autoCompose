import { AIProvider, AICompletionRequest, AICompletionResponse, ProfileContext } from "./types";
import { CATEGORY_POLICIES, isEmailCategory } from "@/modules/email/categories";

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;

  abstract complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  protected buildSystemPrompt(profileContext?: ProfileContext, category = "custom"): string {
    const policy = CATEGORY_POLICIES[isEmailCategory(category) ? category : "custom"];
    const sections: string[] = [
      "You are an expert email composer.",
      "Use only facts supplied in the current request, recent conversation, or selected profile context. Never invent missing facts.",
      `CATEGORY PLAYBOOK: ${policy.aiInstruction}`,
    ];

    if (profileContext) {
      sections.push("");
      sections.push("=== SELECTED PROFILE CONTEXT ===");
      sections.push(...profileContext.sections);
      sections.push("");
      sections.push("Contact information is provided above. Only include it in the email if the user explicitly requests it, or if the email is a formal professional communication (job application, resignation, formal complaint). For casual or personal emails, omit contact details.");
    }

    sections.push("");
    sections.push("Before answering, silently verify factual accuracy, tone, and whether the email achieves the request.");
    sections.push("OUTPUT RULES:");
    sections.push("- Return ONLY the email template");
    sections.push("- No explanations, reasoning, or notes");
    sections.push("- The FIRST LINE must be the email subject only \u2014 a concise summary of the email's purpose (e.g. \"Sick Leave Request\" or \"Meeting Tomorrow\"). Do NOT put a greeting or salutation as the subject.");
    sections.push("- After the subject line, add a blank line, then start the email body with the appropriate greeting/salutation.");
    sections.push("- Do NOT use \"Subject:\" prefix on the subject line.");
    sections.push("- No markdown formatting \u2014 never use asterisks (*) for bold, italics, or lists");
    sections.push("- Use proper email formatting with clear paragraphs");
    sections.push("- Include appropriate salutation and closing");
    sections.push("- Keep it concise and professional");

    if (profileContext?.language && profileContext.language !== "English") {
      sections.push("");
      sections.push(`- Write the email in ${profileContext.language}`);
      sections.push("- Use proper language-specific formatting, salutations, and closings");
    }

    if (profileContext?.signature) {
      sections.push("");
      sections.push(`- Use the following signature unless the user provides a specific one: ${profileContext.signature}`);
    }

    if (profileContext?.language && profileContext.language !== "English") {
      sections.push("");
      sections.push(`- The signature should also be written in ${profileContext.language}`);
    }

    return sections.join("\n");
  }

  protected buildUserPrompt(prompt: string, category: string): string {
    return `Category: ${category.replace(/_/g, " ").toUpperCase()}

Instructions: ${prompt}

Generate a professional email template based on the above.`;
  }
}

// ============================================================
// FILE: src/modules/ai/provider.ts
// ============================================================
// PURPOSE: The shared prompt-building logic that all AI providers inherit — ensures consistent email formatting regardless of which AI model is used.
// HOW IT WORKS: BaseAIProvider is an abstract class that defines the contract (complete() method) and provides two shared methods:
//   - buildSystemPrompt(profileContext, category): Constructs the system message sent to the AI. Combines:
//     1. Role: "You are an expert email composer."
//     2. Rule: Only use provided facts; never invent.
//     3. Category-specific instruction from CATEGORY_POLICIES (e.g., "Write a tailored application that connects the user's most relevant evidence to the target role." for job_application).
//     4. Profile context sections (personal, professional, resume, etc.) if provided.
//     5. Output rules: No markdown, first line = subject only (no "Subject:" prefix), proper email formatting, include signature.
//     6. Language and signature preferences if set.
//   - buildUserPrompt(prompt, category): Wraps the user's instructions with the category label.
//   Concrete providers (NvidiaNIMProvider) only need to implement complete() — the prompt building is shared so all models get the same instructions.
// INTEGRATION: Extended by NvidiaNIMProvider (src/modules/ai/providers/nvidia.ts); uses CATEGORY_POLICIES from email/categories.ts; AI types from src/modules/ai/types.ts. Called by factory and all AI consumers.
// ============================================================
