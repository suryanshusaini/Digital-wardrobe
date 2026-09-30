# Digital Wardrobe — Production Deployment & Operations Guide

This guide details configuration requirements, environment setup, third-party credentials, and hosting constraints for deploying Digital Wardrobe to production (e.g., Vercel, AWS Amplify, Docker/Node).

---

## 1. Environment Variables Checklist

Ensure all variables are configured in your deployment platform's environment dashboard before triggering the first production build.

| Variable | Required | Description | Example / Notes |
|---|---|---|---|
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/wardrobe?retryWrites=true&w=majority` |
| `AUTH_SECRET` | **Yes** | Secret for signing NextAuth JWT sessions | Generate via `openssl rand -base64 32` |
| `AUTH_URL` | **Yes** | Canonical root URL of the deployment | `https://your-domain.com` |
| `GOOGLE_CLIENT_ID` | **Yes** | Google Cloud Console OAuth Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **Yes** | Google Cloud Console OAuth Client Secret | Client secret string |
| `CLOUDINARY_CLOUD_NAME`| **Yes** | Cloudinary account name | Found in Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | **Yes** | Cloudinary API Key | 15-digit number string |
| `CLOUDINARY_API_SECRET`| **Yes** | Cloudinary API Secret | Secret string |
| `GEMINI_API_KEY` | **Yes** | Google AI Studio Gemini API key | Used for garment auto-tagging and stylist |
| `UPSTASH_REDIS_REST_URL`| **Recommended** | Upstash Redis REST endpoint | For distributed rate-limiting across serverless instances |
| `UPSTASH_REDIS_REST_TOKEN`| **Recommended** | Upstash Redis REST bearer token | Bearer token from Upstash dashboard |
| `NEXT_PUBLIC_APP_URL` | Optional | Client-side canonical base URL | Defaults to window origin or `https://your-domain.com` |
| `ENABLE_SENTRY` | Optional | Enable error tracking integration | Set to `"true"` to pipe errors to Sentry |
| `SENTRY_DSN` | Optional | Sentry Project DSN | `https://***@***.ingest.sentry.io/***` |

---

## 2. Google OAuth Configuration

1. Visit the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create or select your project and navigate to **APIs & Services > Credentials**.
3. Create an **OAuth 2.0 Client ID** (Application type: **Web application**).
4. Configure **Authorized JavaScript origins**:
   - `https://your-domain.com`
   - `http://localhost:3000` (for local development)
5. Configure **Authorized redirect URIs**:
   - `https://your-domain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local development)
6. Copy the **Client ID** and **Client Secret** into your deployment platform environment variables.

---

## 3. MongoDB Atlas Configuration

1. **Network Access**:
   - Under **Security > Network Access**, whitelist serverless outbound IPs.
   - For platforms with dynamic serverless IP ranges like Vercel, add `0.0.0.0/0` (Allow access from anywhere) and ensure you use a strong, generated database user password.
2. **Database User**:
   - Create a database user with `readWrite` permissions on the target database (e.g., `digital-wardrobe`).
3. **Mongoose Indexes**:
   - Indexes are defined in `lib/db/models/`. When the app starts, Mongoose ensures:
     - `ItemSchema.index({ userId: 1, category: 1, createdAt: -1 })`
     - `OutfitSchema.index({ userId: 1, createdAt: -1 })`
     - `ShareLinkSchema.index({ token: 1 }, { unique: true })`
     - `ShareLinkSchema.index({ userId: 1 })`
     - `UserSchema.index({ email: 1 }, { unique: true })`

---

## 4. Cloudinary Configuration

1. Obtain your `cloud_name`, `api_key`, and `api_secret` from your [Cloudinary Console](https://console.cloudinary.com/).
2. In Cloudinary **Settings > Upload**, verify that unsigned or signed uploads are allowed according to your account settings (the backend uses authenticated server-side uploads via the Node SDK).
3. The application automatically appends `f_auto,q_auto` to image URLs for WebP/AVIF delivery and sets 3:4 crop transforms for card layouts.

---

## 5. Google Gemini AI Setup

1. Generate an API Key at [Google AI Studio](https://aistudio.google.com/).
2. Assign the key to `GEMINI_API_KEY`.
3. The app invokes `gemini-1.5-flash` with JSON response mode for zero-shot clothing categorization and outfit recommendations.
4. Fallback heuristics: If the Gemini quota is exceeded or the API key is not provided, the upload route automatically falls back to regex-based categorization without failing the upload.

---

## 6. Serverless Payload Limits & HEIC Handling

### Vercel Serverless Function Limits
- Vercel enforces a **4.5MB request body size limit** on serverless functions. Exceeding this triggers an immediate `413 Payload Too Large` from the Vercel edge router before reaching Next.js.

### Image Optimization Pipeline
- **Standard Images (JPEG, PNG, WebP)**: Compressed client-side using HTML5 Canvas (`compressImage` in `components/ui/UploadCard.tsx`) to a maximum dimension of 1600px at 0.82 JPEG quality. Resulting payloads are typically 300KB–800KB, well below the 4.5MB limit.
- **HEIC / HEIF Images**:
  - Desktop Chrome and Firefox **cannot decode HEIC images** in `<canvas>` or `<img>`.
  - The client detects HEIC files, displays a `HEIC · Cloudinary auto-converts` badge, and sends the raw file directly to the server where Cloudinary converts it.
  - **Size Guard**: The client strictly caps HEIC files at 4.5MB (`file.size > 4.5 * 1024 * 1024`) and displays a clear error: *"HEIC files must be under 4.5MB for upload. Please convert larger files to JPG first."*
  - The server (`app/api/upload/route.ts`) also enforces the 4.5MB cap before streaming to Cloudinary.

---

## 7. Distributed Rate Limiting (Upstash Redis)

- In production serverless environments, each invocation may run in an isolated lambda container.
- For synchronized rate-limiting across all lambdas, create a free database at [Upstash](https://upstash.com/) and provide:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- If these are omitted, `lib/rateLimit.ts` logs a warning and falls back to an in-memory sliding window cache per serverless instance.

---

## 8. Verification & Pre-Flight Checklist

Run the following commands locally before pushing to production:

```bash
# 1. Type checking (strict TypeScript, zero errors)
npx tsc --noEmit

# 2. Linting (React 19 hooks, unused variables, styling rules)
npm run lint

# 3. Production Build (Webpack optimization)
npm run build
```

Expected result: All three commands exit with code 0.
