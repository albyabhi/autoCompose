import { z } from "zod";

type EnvVars = z.infer<typeof envSchema>;

const envSchema = z.object({
  MONGODB_URI: z.string().url("MONGODB_URI must be a valid URL").startsWith("mongodb", "MONGODB_URI must start with mongodb:// or mongodb+srv://"),
  NVIDIA_API_KEY: z.string().min(1, "NVIDIA_API_KEY is required"),
  NVIDIA_BASE_URL: z.string().url("NVIDIA_BASE_URL must be a valid URL").default("https://integrate.api.nvidia.com/v1"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters").default("dev-secret-change-in-production-12345"),
  AUTH_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required").optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16, "TELEGRAM_WEBHOOK_SECRET must be at least 16 characters").optional(),
  TELEGRAM_BOT_USERNAME: z.string().min(1, "TELEGRAM_BOT_USERNAME is required").optional(),
});

let validatedEnv: EnvVars | null = null;

function getEnv(): EnvVars {
  if (validatedEnv) return validatedEnv;

  const parsed = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
    NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
    NVIDIA_BASE_URL: process.env.NVIDIA_BASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  });

  if (!parsed.success) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
    }
    console.warn("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    return parsed.data as unknown as EnvVars;
  }

  validatedEnv = parsed.data;
  return validatedEnv;
}

export function getConfig() {
  const env = getEnv();
  return {
    mongodb: {
      uri: env.MONGODB_URI,
      options: {
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    },
    nvidia: {
      apiKey: env.NVIDIA_API_KEY,
      baseUrl: env.NVIDIA_BASE_URL,
      models: {
        deepseek: "deepseek-ai/deepseek-v4-flash",
        nemotron: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        gptOss: "openai/gpt-oss-20b",
        mistralSmall: "mistralai/mistral-small-4-119b-2603",
        llamaMaverick: "meta/llama-4-maverick-17b-128e-instruct",
        minimaxM27: "minimaxai/minimax-m2.7",
        llamaNemotronNano: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
        nemotron3Ultra: "nvidia/nemotron-3-ultra-550b-a55b",
      } as const,
    },
    auth: {
      secret: env.AUTH_SECRET,
      url: env.AUTH_URL,
      rateLimit: {
        registration: {
          ip: { maxRequests: 5, windowMs: 60_000 },
          global: { maxRequests: 20, windowMs: 60_000 },
        },
      },
    },
    app: {
      env: env.NODE_ENV,
      url: env.NEXT_PUBLIC_APP_URL,
      cronSecret: env.CRON_SECRET ?? null,
      isDev: env.NODE_ENV === "development",
      isProd: env.NODE_ENV === "production",
    },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN ?? null,
      webhookSecret: env.TELEGRAM_WEBHOOK_SECRET ?? null,
      botUsername: env.TELEGRAM_BOT_USERNAME ?? null,
      enabled: !!env.TELEGRAM_BOT_TOKEN && !!env.TELEGRAM_WEBHOOK_SECRET,
    },
  } as const;
}

export type AppConfig = ReturnType<typeof getConfig>;

// ============================================================
// FILE: src/config/index.ts
// ============================================================
// PURPOSE: Validates and provides all environment configuration in one place so the rest of the app doesn't have to worry about missing or malformed settings.
// HOW IT WORKS: Uses Zod (a validation library) to define exactly what environment variables are required, what format they must be in (URLs, minimum lengths, etc.), and sensible defaults. On first use, it reads process.env, validates everything against the schema, and caches the result. In production, invalid config crashes the app immediately (fail fast). In development, it warns but continues so you can test. The getConfig() function returns a structured object with sections: mongodb (connection details), nvidia (AI API keys and model IDs), auth (secrets, rate limits), app (environment, URLs), telegram (bot tokens, webhook secrets).
//   Key settings: 8 AI models available via NVIDIA NIM; AUTH_SECRET must be 32+ chars (used for encryption and JWT); MongoDB pool size 1-10; Telegram optional but enables bot features.
// INTEGRATION: Read by db.ts (MongoDB connection), crypto.ts (AUTH_SECRET for encryption), auth.ts (NextAuth config), telegram/bot.ts (bot token), schedule worker, AI factory, and every module that needs external service credentials.
// ============================================================
