import { AIProvider, AICompletionRequest, AICompletionResponse, ProfileContext } from "./types";

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;

  abstract complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  protected buildSystemPrompt(profileContext?: ProfileContext): string {
    const sections: string[] = [
      "You are an expert email composer. Your task is to generate professional email templates.",
    ];

    if (profileContext) {
      sections.push("");
      sections.push("=== USER PROFILE ===");
      sections.push(...profileContext.sections);
    }

    sections.push("");
    sections.push("Process internally (do NOT output this reasoning):");
    sections.push("1. DIVERGE - Consider 3 different approaches:");
    sections.push("   - Different tones (formal, semi-formal, direct)");
    sections.push("   - Different structures");
    sections.push("   - Different opening/closing strategies");
    sections.push("2. CONVERGE - Select the best approach based on context and professionalism");
    sections.push("3. EVALUATE - Verify the chosen email achieves its goal effectively");
    sections.push("");
    sections.push("OUTPUT RULES:");
    sections.push("- Return ONLY the email template");
    sections.push("- No explanations, reasoning, or notes");
    sections.push("- No subject line prefixes like \"Subject:\"");
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
    return `Category: ${category.replace("_", " ").toUpperCase()}

Instructions: ${prompt}

Generate a professional email template based on the above.`;
  }
}
