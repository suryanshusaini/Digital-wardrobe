# Digital Wardrobe

> An editorial 3D digital closet and outfit curation studio. Catalog your clothing, assemble layered looks on an interactive canvas, explore your collection on a revolving 3D showcase podium, get AI stylist recommendations, and share private lookbooks.

---

## Features

- **3D Studio Showcase Podium**: Interactive, demand-frameloop WebGL carousel built with React Three Fiber and Three.js. Supports touch swipe, momentum damping, spring snap-to-card, Lightformer studio lighting, and dynamic windowing for collections from 1 to 50+ pieces.
- **Layered Outfit Maker Canvas**: Multi-layer drag, rotate, resize, and z-index ordering studio to assemble pieces into complete looks with snapshot exports.
- **Instant Photo Archiving & Tagging**: Client-side image compression (max 2048px @ 0.85 JPEG) with real-time XHR progress tracking, automatic Gemini Flash Vision garment categorization, and binary magic-byte validation.
- **Apple HEIC/HEIF Compatibility**: Direct bypass of canvas decoding limitations in Chrome and Firefox with automated Cloudinary server-side conversion and 4.5MB host payload guards.
- **Editorial Typography & Three-Way Dark Mode**: Self-hosted Cormorant Garamond serif headings and Geist Sans UI typography. Three-way theme toggle (System / Light / Dark) with zero-flash head script and `--surface-mat` photo tiles for dark-mode harmonization.
- **AI Personal Stylist**: Weather-contextual outfit recommendations powered by Google Gemini, complete with rate limiting and structured schema defense.
- **Public Shareable Lookbooks**: Read-only public URLs (`/share/[token]`) protected by user-controlled token revocation, regeneration, and strict privacy projections.
- **Privacy & Complete Account Deletion**: Self-service account deletion cascading across MongoDB items, outfits, share links, user credentials, and Cloudinary media assets with re-confirmation safeguards.
- **Production Defense & Resilience**: Enforcing Content Security Policy (CSP), HSTS, distributed multi-tier rate limiting (Upstash Redis + in-memory fallback), Zod schema validation, and structured error boundaries.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Webpack build, Server Actions & Route Handlers) |
| **Language & Typing** | [TypeScript 5](https://www.typescriptlang.org/) (Strict mode, full type-safety) |
| **UI & Styling** | [Tailwind CSS 4](https://tailwindcss.com/), CSS Custom Properties (Warm Editorial Palette) |
| **3D & Canvas** | [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) (Layout animations, spring physics, gestures) |
| **Authentication** | [NextAuth v5 (Auth.js)](https://authjs.dev/) (Credentials with bcrypt + Google OAuth) |
| **Database & ODM** | [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) |
| **Media Pipeline** | [Cloudinary](https://cloudinary.com/) (Secure uploads, auto-WebP/AVIF transforms, 3:4 crops) |
| **AI & Vision** | [Google Gemini 2.5 Flash](https://aistudio.google.com/) (Auto-tagging & Stylist advice) |
| **Rate Limiting** | [Upstash Redis](https://upstash.com/) REST API with in-memory sliding window fallback |
| **Validation** | [Zod 4](https://zod.dev/) (Request payloads, ObjectId hex patterns, LLM outputs) |

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │             Next.js 16                │
                      │  (Enforced CSP, HSTS, Secure Headers) │
                      └──────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
      │      App Router     │ │     Route Handlers  │ │   3D & Canvas UI    │
      │   (Proxy Auth Gate) │ │  (/api/items, auth, │ │ (Podium, ItemCard,  │
      │   • / (Gallery/Tabs)│ │   upload, stylist,  │ │  OutfitMaker, Modals│
      │   • /analytics      │ │   share, account)   │ │  Code-split chunks) │
      │   • /share/[token]  │ └──────────┬──────────┘ └─────────────────────┘
      │   • /privacy, /terms│            │
      └─────────────────────┘            ▼
                               ┌───────────────────┐
                               │ Security & Limits │
                               │ • RateLimiter     │
                               │ • Zod Schemas     │
                               │ • Request Logger  │
                               └─────────┬─────────┘
                                         │
        ┌──────────────────┬─────────────┴────────────┬──────────────────┐
        ▼                  ▼                          ▼                  ▼
┌──────────────┐  ┌──────────────────┐      ┌──────────────────┐  ┌──────────────┐
│   MongoDB    │  │ Cloudinary Media │      │  Google Gemini   │  │   Upstash    │
│  (Atlas M0+) │  │ (Auto-format/3:4)│      │  (Vision & Chat) │  │ Redis (REST) │
└──────────────┘  └──────────────────┘      └──────────────────┘  └──────────────┘
```

---

## Setup Instructions

### Prerequisites
- **Node.js**: `v20.x` or later
- **npm**: `v10.x` or later
- **MongoDB**: Local MongoDB instance or free MongoDB Atlas URI
- **Cloudinary Account**: Cloud name, API key, and API secret

### 1. Clone & Install
```bash
git clone https://github.com/your-username/digital-wardrobe.git
cd digital-wardrobe
npm install
```

### 2. Configure Environment Variables
Copy the template file to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials (see [Environment Variables](#environment-variables) below).

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## Environment Variables

| Variable | Required | Description |
|---|:---:|---|
| `MONGODB_URI` | Yes | MongoDB connection string (Atlas or local `mongodb://...`) |
| `AUTH_SECRET` | Yes | 32-character secret key for signing JWTs (`openssl rand -base64 32`) |
| `NEXTAUTH_SECRET` | Optional | Fallback secret alias for NextAuth |
| `NEXTAUTH_URL` | Optional | Canonical application URL (e.g. `http://localhost:3000` or production domain) |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud account name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API Secret |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth Client ID (or `AUTH_GOOGLE_ID`) |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth Client Secret (or `AUTH_GOOGLE_SECRET`) |
| `GEMINI_API_KEY` | Optional | Google AI Studio API Key for automated categorization & AI stylist |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis REST endpoint for multi-container rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis REST token |
| `ENABLE_SENTRY` | Optional | Set to `"true"` to forward structured errors to Sentry |

---

## Screenshots

> Visual lookbook previews will be added to `public/screenshots/`.

---

## Verification & Quality Assurance

```bash
# Type check TypeScript codebase
npx tsc --noEmit

# Lint against Next.js and ESLint rules
npm run lint

# Production Webpack compilation
npm run build
```

---

## License

MIT &copy; 2026 Digital Wardrobe.
