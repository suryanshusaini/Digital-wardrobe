# Digital Wardrobe — System Architecture

This document outlines the technical architecture, design system, component hierarchy, security protocols, and operational workflows of Digital Wardrobe.

---

## 1. System Overview & Technology Stack

Digital Wardrobe is an editorial-grade, minimalist-luxury digital closet and styling application designed following Zara/COS aesthetic principles.

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16.3.5 | App Router, Server Components & Client Boundaries, Webpack build |
| **Language & Runtime** | TypeScript 5, React 19.2.8 | Strict mode, zero `any`, React 19 hooks and invariants |
| **Styling** | Tailwind CSS v4 | CSS variables in `app/globals.css`, `@theme` token extensions |
| **Typography** | Local WOFF2 fonts | `Cormorant Garamond` (headings, 22.4KB latin subset), `Geist Sans`, `Geist Mono` |
| **3D Rendering** | Three.js 0.183, R3F 9.5, Drei 10.7 | 3D Podium carousel, ContactShadows, studio lighting rig, CSS fallback |
| **Motion** | Framer Motion 13.2 | Route crossfades, layout transitions, drag gestures |
| **Authentication** | NextAuth.js v5 (beta.32) | Google OAuth + Credentials (bcryptjs salt rounds 12), route protection via `proxy.ts` |
| **Database & ODM** | MongoDB Atlas, Mongoose 9.10 | Multi-user scoping on all documents, compound indexes |
| **Storage & Media** | Cloudinary v2.11 | Media storage, dynamic WebP/AVIF transforms, 3:4 aspect-ratio crops |
| **AI Stylist & Vision**| Google Gemini 1.5 Flash | Automatic garment classification, occasion & weather tagging, conversational stylist |
| **Rate Limiting** | Custom Sliding Window Store | Supports Upstash Redis REST API with in-memory fallback |
| **Observability** | Structured JSON Logger | `lib/logger.ts` with request correlation IDs, PII masking, and Sentry hook |

---

## 2. Directory Structure

```
digital-wardrobe/
├── app/
│   ├── api/
│   │   ├── auth/            # NextAuth catch-all & signup endpoints
│   │   ├── categorize/      # Gemini Flash auto-tagging
│   │   ├── items/           # CRUD for wardrobe items
│   │   ├── outfits/         # CRUD for outfits
│   │   ├── share/           # Public read-only lookbook endpoints
│   │   ├── stylist/         # AI Stylist chat endpoint
│   │   └── upload/          # Direct-to-Cloudinary image ingest
│   ├── analytics/           # Server-rendered wardrobe analytics
│   ├── login/ & signup/     # Luxury auth forms with error handling
│   ├── share/[token]/       # Public read-only lookbook view
│   ├── error.tsx            # Root route error boundary
│   ├── global-error.tsx     # Root layout error boundary
│   ├── not-found.tsx        # Minimalist 404 page
│   ├── loading.tsx          # Shimmer loading screen
│   ├── layout.tsx           # Base layout, theme script, local fonts
│   └── page.tsx             # Wardrobe gallery, 3D Podium, Outfit Maker
├── components/
│   ├── 3d/                  # 3D Podium, PodiumCanvas, studio lighting
│   ├── layout/              # Header, navigation, theme toggle, account indicator
│   └── ui/                  # ItemCard, UploadCard, OutfitMaker, OutfitMakerErrorBoundary, Modals
├── lib/
│   ├── db/                  # MongoDB connection & Mongoose models (Item, Outfit, User, ShareLink)
│   ├── validation/          # Zod validation schemas
│   ├── env.ts               # Startup environment variable validation
│   ├── logger.ts            # Structured JSON logger & PII redaction
│   ├── rateLimit.ts         # Sliding window rate limiter (Upstash/Memory)
│   └── cloudinaryUrl.ts     # CDN URL optimization helpers
├── proxy.ts                 # Next.js 16 authentication & route guard
└── next.config.ts           # Security headers, CSP Report-Only, image domains
```

---

## 3. Design System & Tokens

### Aesthetics & Typography
The interface uses a warm minimalist palette inspired by contemporary fashion archives:
- **Base Background**: Soft Stone (`#f8f7f5` in light mode, `#141210` in dark mode).
- **Surfaces**: Crisp white cards with fine borders (`border-stone-200/60` light, `border-stone-800` dark).
- **Accent**: Warm Terracotta (`#b85d3b`, hover `#a04e2f`).
- **Focus Ring**: Terracotta with $\ge 3:1$ contrast ratio against both light and dark surfaces (`var(--ring)`).
- **Headings**: Editorial serif via self-hosted `Cormorant Garamond` (22.4KB latin subset in `public/fonts/cormorant-garamond-latin.woff2`).
- **Body & Controls**: Clean utilitarian sans (`Geist Sans`).

### Dark Mode Architecture
- Three-state preference: `light`, `dark`, or `system`.
- Inlined inline head script in `app/layout.tsx` checks `localStorage` or `prefers-color-scheme` before first paint, setting `data-theme="dark"` on `<html>`.
- Zero hydration mismatch or flash of unstyled content (`suppressHydrationWarning` on `<html>`).

---

## 4. 3D Podium Architecture

The 3D Showcase (`components/3d/Podium.tsx` & `PodiumCanvas.tsx`) renders wardrobe items as architectural cards in a physical gallery:
- **Rendering Loop**: `frameloop="demand"` for zero GPU and battery drain while idle.
- **Auto-Rotation & Invalidation**: Custom RAF invalidator ticks the frame loop during idle rotation (12s per revolution). Pauses on user drag/pointer down, resumes after 4s idle. Halts when scrolled out of view, when tab is hidden, or under `prefers-reduced-motion`.
- **Card Geometry**: Standardized 3:4 aspect ratio (`1.5 × 2.0 × 0.045`) cards with rounded bevels (`RoundedBox`, `roughness: 0.9` matte finish).
- **Interaction**: Direct horizontal drag interaction with inertia, snap-to-card physics, and keyboard arrow navigation. OrbitControls are explicitly avoided to preserve card orientation.
- **Lighting Rig**: Rectangular and ring `Lightformer` studio softboxes, warm directional rim light (`#fff8f0`), key light, and `ContactShadows` ground projection.
- **Fail-Safe**: Embedded WebGL error boundary and `hasWebGL()` feature check that falls back gracefully to a 3D-perspective CSS fan stack (`CssCardStack`).

---

## 5. Outfit Maker Architecture

The canvas editor (`components/ui/OutfitMaker.tsx`) allows freeform layering of clothing pieces:
- **Staging Canvas**: Freeform drag-and-drop workspace powered by Framer Motion.
- **Transform Controls**: Smooth rotation, scaling, and z-index depth reordering.
- **Error Isolation**: Wrapped in `<OutfitMakerErrorBoundary>` (`components/ui/OutfitMakerErrorBoundary.tsx`). Any canvas or drag state exception triggers a polite localized recovery card without crashing the rest of the application.
- **Export**: Generates high-resolution PNG lookbook cards for sharing or local archiving.

---

## 6. Security & Data Protection

### Per-User Data Isolation
- Every item, outfit, and share link is associated with the owner's authenticated identity (`session.user.email` / `session.user.id`).
- All queries strictly enforce scoping (e.g., `Item.find({ $or: [{ userId: email }, { userId: id }] })`).
- `ObjectId` format validation via Zod and `mongoose.Types.ObjectId.isValid` on all route parameters prevent casting errors and injection.

### Authentication Hardening
- **Passwords**: Hashed with `bcryptjs` using 12 salt rounds. Mongoose `User` schema sets `select: false` on password fields.
- **Email Enumeration Prevention**: Signup, login, and password checks return generic messages ("Unable to sign in. Please verify your credentials and try again.") to prevent probing registered addresses.
- **Secure Cookies**: NextAuth configured with `useSecureCookies: true` in production environments.

### Rate Limiting
Configured via `lib/rateLimit.ts` with strict per-IP and per-user buckets:
- Image Uploads: 10 per minute.
- AI Stylist: 5 per minute, 50 per day.
- Share Link Creation: 10 per minute.
- Public Share Read: 60 per minute per IP.
- Authentication (Login & Signup): 5 per minute per IP/email.

### Security Headers & CSP
Configured in `next.config.ts`:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (production)
- `Content-Security-Policy-Report-Only`: Active monitor mode to verify all scripts, fonts, and Cloudinary image sources before blocking enforcement.

---

## 7. Observability & Logging

- **Logger (`lib/logger.ts`)**: Structured JSON output format (`level`, `message`, `requestId`, `timestamp`, `context`).
- **PII Scrubbing**: Automatic redaction of emails, passwords, tokens, API keys, and authorization headers in all logs.
- **Traceability**: All API handlers extract or assign an `x-request-id` header for end-to-end request tracing.
- **Sentry Hook**: Integrated hook point ready to stream production exceptions to Sentry when `ENABLE_SENTRY=true`.
