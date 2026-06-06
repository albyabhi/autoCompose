const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

export const TELEGRAM_MAX_MESSAGE = 4096;

export interface TextChunk {
  text: string;
}

export function chunkText(input: string, limit = TELEGRAM_MAX_MESSAGE): TextChunk[] {
  if (input.length <= limit) return [{ text: input }];
  const chunks: TextChunk[] = [];
  let remaining = input;
  while (remaining.length > limit) {
    let breakAt = remaining.lastIndexOf("\n\n", limit);
    if (breakAt < limit * 0.5) {
      breakAt = remaining.lastIndexOf("\n", limit);
    }
    if (breakAt < limit * 0.5) {
      breakAt = remaining.lastIndexOf(" ", limit);
    }
    if (breakAt < limit * 0.5) {
      breakAt = limit;
    }
    chunks.push({ text: remaining.slice(0, breakAt).trimEnd() });
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length > 0) chunks.push({ text: remaining });
  return chunks;
}

export function buildDeepLink(botUsername: string, code: string): string {
  const username = botUsername.replace(/^@/, "");
  return `https://t.me/${username}?start=${code}`;
}

export function describeCategoryLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
