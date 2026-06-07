import { InlineKeyboardMarkup } from "grammy/types";

export const CB = {
  menu: "tg:menu:home",
  compose: "tg:menu:compose",
  cancel: "tg:menu:cancel",
  categoryPrefix: "tg:cat:",
  regenerate: "tg:gen:regen",
  sendStart: "tg:send:start",
  sendToMe: "tg:send:tome",
  sendConfirm: "tg:send:confirm",
} as const;

export function mainMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✉ Compose Email", callback_data: CB.compose },
        { text: "❓ Help", callback_data: "tg:menu:help" },
      ],
    ],
  };
}

export function categoryKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Job Application", callback_data: `${CB.categoryPrefix}job_application` },
        { text: "Leave Request", callback_data: `${CB.categoryPrefix}leave_request` },
      ],
      [
        { text: "Sick Leave", callback_data: `${CB.categoryPrefix}sick_leave` },
        { text: "Resignation", callback_data: `${CB.categoryPrefix}resignation` },
      ],
      [
        { text: "Meeting Request", callback_data: `${CB.categoryPrefix}meeting_request` },
        { text: "Complaint", callback_data: `${CB.categoryPrefix}complaint` },
      ],
      [
        { text: "General", callback_data: `${CB.categoryPrefix}custom` },
        { text: "↩️ Main menu", callback_data: CB.menu },
      ],
    ],
  };
}

export function reviewKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "📤 Send", callback_data: CB.sendStart },
        { text: "👤 To me", callback_data: CB.sendToMe },
      ],
      [
        { text: "🔁 Regenerate", callback_data: CB.regenerate },
        { text: "↩️ Main menu", callback_data: CB.menu },
      ],
    ],
  };
}

export function sendConfirmKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Send", callback_data: CB.sendConfirm },
        { text: "↩️ Cancel", callback_data: CB.cancel },
      ],
    ],
  };
}
