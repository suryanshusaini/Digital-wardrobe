import { z } from "zod";

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET or NEXTAUTH_SECRET is required").optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // Optional integrations
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  ENABLE_SENTRY: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

let validatedEnv: Env | null = null;

export function getValidatedEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    const message = `[FATAL] Missing or invalid environment configuration:\n${errorDetails}\n\nPlease check your .env or .env.local file. See .env.example for required variables.`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    } else {
      console.warn(`\n⚠️  ENVIRONMENT WARNING:\n${message}\n`);
    }

    // Return unparsed process.env cast in non-production to allow build/test stages
    return process.env as unknown as Env;
  }

  validatedEnv = parsed.data;
  return validatedEnv;
}
