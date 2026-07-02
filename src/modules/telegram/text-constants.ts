const b = (t: string) => `<b>${t}</b>`;
const c = (t: string) => `<code>${t}</code>`;
const i = (t: string) => `<i>${t}</i>`;

export const T = {
  // ── Command / Status Messages ──────────────────────────
  alreadyLinked: () =>
    `${b("Linked")} Your Telegram account is already linked.\nType /menu to get started.`,

  accountLinked: () =>
    `${b("Account Linked")}\nType /menu to get started.`,

  invalidCode: (settingsUrl: string) =>
    `${b("Invalid Code")}\nThe code provided is invalid or has expired.\n\nGenerate a new one at: ${settingsUrl}`,

  welcomeBack: () =>
    `${b("Welcome Back")}\nType /menu to get started.`,

  welcomeNew: (helpText: string, settingsUrl: string) =>
    `${b("Welcome to AutoCompose")}\n\n${helpText}\n\nOpen Settings: ${settingsUrl}`,

  welcomeInstructionsDeepLink: () =>
    `1. Open Settings > Telegram Integration.\n2. Click ${b("Generate login code")}.\n3. Tap the deep link or paste the code here.`,

  welcomeInstructionsManual: () =>
    `1. Open Settings > Telegram Integration.\n2. Click ${b("Generate login code")}.\n3. Send the code here.`,

  cancelled: () => `Cancelled.`,

  help: () =>
    `${b("AutoCompose Bot")}\n\n` +
    `/start \u2014 link or show menu\n` +
    `/menu \u2014 main menu\n` +
    `/cancel \u2014 abort current flow\n` +
    `/status \u2014 show account info\n` +
    `/help \u2014 this help\n\n` +
    `Use the inline buttons to navigate.`,

  notLinked: () =>
    `Not linked. Type /start to begin.`,

  status: (linkedAt: string, modelId: string, gmailConfigured: boolean) =>
    `${b("Account Status")}\n\n` +
    `Linked: ${c(linkedAt)}\n` +
    `Model: ${c(modelId)}\n` +
    `Gmail: ${gmailConfigured ? "Configured" : "Not configured"}`,

  unknownAction: () =>
    `Unknown action. Use /menu to return to the main menu.`,

  // ── Compose Flow ───────────────────────────────────────
  selectCategory: () =>
    `${b("New Email")}\nSelect a category:`,

  unknownCategory: () => `Unknown category`,

  promptInstructions: (categoryLabel: string) =>
    `${b(categoryLabel)}\n\nDescribe what you need (the more detail the better).`,

  promptTooShort: () =>
    `Please provide a little more detail (at least 10 characters).`,

  promptTooLong: () =>
    `Prompt is too long. Please shorten it to under 5000 characters.`,

  generating: (modelName: string) =>
    `Generating email using ${b(modelName)}...`,

  recipientLine: (recipient: string) =>
    `${b("Recipient")} ${c(recipient)}\n`,

  draftResult: (categoryLabel: string, subject: string, body: string, recipient?: string) =>
    `${b(categoryLabel)}\n\n` +
    `${b("Subject")} ${i(subject)}\n\n` +
    `${body}` +
    (recipient ? `\n${b("Recipient")} ${c(recipient)}` : ""),

  truncated: () => `...(truncated, full text saved)`,

  generationFailed: () =>
    `Generation failed. Please try again or type /cancel to abort.`,

  nothingToRegenerate: () => `Nothing to regenerate.`,

  regenerating: () => `Regenerating...`,

  mainMenu: () =>
    `${b("Main Menu")}\nSelect an option:`,

  // ── Send Flow ──────────────────────────────────────────
  notLinkedError: () =>
    `Not linked. Type /start to link.`,

  gmailNotConfigured: (settingsUrl: string) =>
    `Gmail credentials are not configured.\n\nAdd them in Settings > Email Credentials:\n${settingsUrl}`,

  noDraft: () =>
    `No draft available. Use /menu to compose a new email.`,

  rateLimited: () =>
    `Rate limit reached (10 sends per hour). Please wait and try again.`,

  promptRecipient: () =>
    `${b("Send Email")}\n\nWho should I send it to?\n\nSend the recipient email address, or /cancel to abort.`,

  invalidEmail: () =>
    `That doesn't look like a valid email address.\n\nTry again (e.g. ${c("name@example.com")}), or /cancel to abort.`,

  flowLost: () =>
    `Send flow lost. Please start over with /menu.`,

  subjectPrompt: (to: string, autoSubject: string, extractedNote?: string) =>
    `${b("Subject")}\n\n` +
    `To: ${c(to)}${extractedNote ? ` ${extractedNote}` : ""}\n\n` +
    `Type a subject, or /skip to use the auto-detected one:\n` +
    `${i(autoSubject)}`,

  subjectCannotBeEmpty: (autoSubject: string) =>
    `Subject cannot be empty.\n\nType a subject, or /skip to use the auto-detected one: ${i(autoSubject)}.`,

  autoSubjectNotDetected: () =>
    `Could not detect an auto-generated subject.\n\nPlease type a custom subject, or /cancel to abort.`,

  missingData: () => `Missing data`,

  sending: () => `Sending...`,

  sent: (to: string, subject: string) =>
    `${b("Sent")}\n\n` +
    `To: ${c(to)}\n` +
    `Subject: ${i(subject)}`,

  sendFailed: (reason: string) =>
    `${b("Send Failed")}\n\n${reason}`,

  cancelledFlow: () => `Cancelled.`,
} as const;
