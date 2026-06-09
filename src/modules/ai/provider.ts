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
    }

    sections.push("");
    sections.push("Before answering, silently verify factual accuracy, tone, and whether the email achieves the request.");
    sections.push("OUTPUT RULES:");
    sections.push("- Return ONLY the email template");
    sections.push("- No explanations, reasoning, or notes");
    sections.push("- No subject line prefixes like \"Subject:\"");
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
