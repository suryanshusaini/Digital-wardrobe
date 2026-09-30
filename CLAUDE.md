# Digital Wardrobe — Developer & AI Context Guide

This document provides a comprehensive technical map of the Digital Wardrobe codebase for AI assistants and developers.

---

## 1. Project Overview

Digital Wardrobe is a personal closet application that transforms clothing photos into studio-grade flat-lay cutouts, stages them on an interactive canvas to save outfits, displays items on a 3D architectural showcase podium, and provides a multi-user digital closet experience with editorial Zara/COS aesthetics.

### Core Feature Areas
- **Gallery View (`app/page.tsx`)**: Categorized horizontal snap-scroll rows (Tops, Bottoms, Shoes, Accessories) with clean hover overlays for item editing and cascading deletion. Supports progressive pagination (48 items/page) and search/filter layout animations.
- **3D Showcase Podium (`components/3d/Podium.tsx` & `PodiumCanvas.tsx`)**: R3F architectural rotating carousel running on demand frame loop with drag inertia, snap physics, studio lighting rig, and CSS fan-stack fallback.
- **Outfit Maker (`components/ui/OutfitMaker.tsx`)**: Drag-and-drop canvas powered by Framer Motion. Desktop features a collapsible sidebar; mobile features an accessible slide-up bottom drawer. Wrapped in `<OutfitMakerErrorBoundary>` for fault isolation.
- **Saved Outfits ("My Outfits", `components/ui/SavedOutfits.tsx`)**: Gallery of saved outfits with normalized fixed-box item thumbnail rows, read-only detail view, inline renaming, and edit-in-canvas loading.
- **Public Lookbooks (`app/share/[token]/page.tsx`)**: Shareable read-only wardrobe links with hardened projections (no emails or internal metadata leaked) and robots `noindex` directives.
- **Upload Pipeline (`app/api/upload/route.ts`)**: Direct-to-Cloudinary image upload pipeline with client-side canvas compression (1600px / 0.82 quality) and raw HEIC forwarding capped at 4.5MB for Vercel compatibility.
- **AI Auto-Categorization (`app/api/categorize/route.ts`)**: Gemini Flash Vision categorization with pattern/keyword fallback heuristics.

### Technology Stack
- **Framework**: Next.js 16.3.5 (App Router with Webpack build optimization)
- **Language & Runtime**: TypeScript 5, React 19.2.8, Node.js
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) with CSS variables in `app/globals.css` and `@theme` tokens
- **Typography**: Local self-hosted WOFF2 fonts (`Cormorant Garamond` serif headings, `Geist Sans`, `Geist Mono`)
- **Authentication**: NextAuth.js v5 (`next-auth@5.0.0-beta.32` / Auth.js) with Google OAuth + Credentials (bcryptjs 12 rounds)
- **Database & ODM**: MongoDB with Mongoose 9.10.0 (connection helper in `lib/db/mongodb.ts`)
- **Image Storage**: Cloudinary (`cloudinary` v2.11.0) for remote asset hosting
- **3D Graphics**: Three.js 0.183, `@react-three/fiber` 9.5, `@react-three/drei` 10.7
- **Motion & UI**: Framer Motion 13.2.0, Lucide React 1.45.0
- **Validation & Rate Limiting**: Zod 4.3, Upstash Redis REST store with in-memory sliding window fallback

---

## 2. Authentication & Multi-User Architecture

### Auth Stack & Configuration
- **Root Auth Config**: `auth.ts` exports `{ handlers, auth, signIn, signOut }` supporting both Google OAuth and CredentialsProvider. Configured with secure cookies in production and session callbacks ensuring `session.user.id = token.sub`.
- **Catch-all API Route**: `app/api/auth/[...nextauth]/route.ts` imports and re-exports `{ GET, POST }` from `@/auth`.
- **Auth Gate (`proxy.ts`)**: In Next.js 16, `proxy.ts` wraps `auth()` and redirects unauthenticated users to `/login`. Matches all routes except static assets, `api/auth`, `api/share`, and public `/share` pages.
- **Client Provider**: `components/Providers.tsx` wraps the app layout in `<SessionProvider>` to enable client-side `useSession()`.
- **Account Indicator**: `components/layout/AccountIndicator.tsx` rendered in `app/layout.tsx`. Fixed at bottom-left with theme switcher (light/dark/system), user profile details, and sign out button.

### Data Scoping & Multi-User Isolation
- **Status**: **VERIFIED & ENFORCED**.
- **User Identifier**: All items, outfits, and share tokens are scoped to `session.user.email` (with `session.user.id` fallback).
- **Protected Endpoints**:
  - `GET /api/items`: Checks `await auth()`; queries `Item.find({ $or: [{ userId: userEmail }, { userId: session.user.id }] })`.
  - `DELETE /api/items/[id]`: Checks `await auth()`; verifies item ownership before deletion; cascades removal from user's outfits.
  - `PATCH /api/items/[id]`: Checks `await auth()`; restricts updates to items owned by the session user.
  - `POST /api/upload`: Checks `await auth()`; stamps `userId: session.user.email` onto the newly created `Item`.
  - `GET /api/outfits`: Checks `await auth()`; queries `Outfit.find({ $or: [{ userId: userEmail }, { userId: session.user.id }] })`.
  - `POST /api/outfits`: Checks `await auth()`; assigns `userId: session.user.email` upon creation.
  - `GET /api/outfits/[id]`, `DELETE /api/outfits/[id]`, `PATCH /api/outfits/[id]`: All verify ownership against the active session.
  - `POST /api/share`: Checks `await auth()`; generates unique share token for active user's wardrobe.
  - `GET /api/share/[token]`: Public rate-limited read (60 req/min) returning ONLY sanitized public item fields and display name.

---

## 3. Data Model

The application uses MongoDB via Mongoose. Schemas are defined in `lib/db/models/`.

### `Item` (`lib/db/models/Item.ts`)
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated MongoDB primary key |
| `name` | `String` (required) | Item title (e.g., "Vintage Leather Jacket") |
| `category` | `String` (required) | Enum: `"top"`, `"bottom"`, `"shoes"`, `"accessory"` |
| `imageUrl` | `String` (required) | Processed Cloudinary URL with stone background |
| `originalImageUrl` | `String` (optional) | Original uploaded photo URL |
| `tags.weather` | `[String]` | Weather tags (e.g., `["summer", "spring"]`) |
| `tags.occasion` | `[String]` | Occasion tags (e.g., `["casual", "party"]`) |
| `userId` | `String` (indexed) | Email / User ID of the owner for multi-user isolation |
| `createdAt` | `Date` | Timestamp (defaults to `Date.now`) |

### `Outfit` (`lib/db/models/Outfit.ts`)
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated MongoDB primary key |
| `name` | `String` (required) | Outfit title (e.g., "Casual Friday") |
| `items` | `[OutfitItem]` | Array of staged items with canvas spatial coordinates |
| `items[].itemId` | `ObjectId` (ref `Item`) | Reference to wardrobe `Item` |
| `items[].imageUrl` | `String` | Item image URL for standalone rendering |
| `items[].x` | `Number` | Canvas X coordinate offset |
| `items[].y` | `Number` | Canvas Y coordinate offset |
| `items[].width` | `Number` | Rendered width on canvas (default `150`) |
| `items[].zIndex` | `Number` | Layer depth ordering (default `1`) |
| `items[].rotation` | `Number` | Rotation degrees (default `0`) |
| `userId` | `String` (indexed) | Email / User ID of the owner for multi-user isolation |
| `createdAt` | `Date` | Timestamp (defaults to `Date.now`) |

### `User` (`lib/db/models/User.ts`)
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated MongoDB primary key |
| `email` | `String` (unique, indexed) | User email |
| `password` | `String` (`select: false`) | Hashed password via bcrypt (12 rounds) |
| `name` | `String` | User full or display name |
| `image` | `String` | Avatar image URL |

### `ShareLink` (`lib/db/models/ShareLink.ts`)
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated MongoDB primary key |
| `token` | `String` (unique, indexed) | NanoId / secure token |
| `userId` | `String` (indexed) | Owner user ID / email |
| `userName` | `String` | Owner display name (sanitized) |
| `createdAt` | `Date` | Timestamp |

---

## 4. Design System & Conventions

### Color Palette & Theme Tokens
- **Canvas / App Background**: `#f8f7f5` (stone-100) in light mode, `#141210` in dark mode (`--background`).
- **Surfaces**: Crisp white (`#ffffff`) in light mode, deep warm charcoal (`#1c1a17`) in dark mode (`--surface`).
- **Borders**: Subdued borders (`--border`).
- **Accent System**:
  - `--accent`: `#b85d3b` (warm terracotta)
  - `--accent-hover`: `#a04e2f`
  - `--ring`: High-contrast terracotta (`#b85d3b` / `#d97757`) meeting $\ge 3:1$ contrast against all surfaces.

### Typography
- **Headings**: Editorial serif via `Cormorant Garamond` (22.4KB local latin subset in `public/fonts/`).
- **Body & UI**: `Geist Sans` and `Geist Mono` loaded locally with zero external Google Fonts network calls.

### Error Boundaries & Resiliency
- `app/error.tsx`: Root route error boundary with retry CTA and return to wardrobe.
- `app/global-error.tsx`: Root layout error boundary with `<html>` and `<body>` tags.
- `app/share/[token]/error.tsx`: Lookbook error boundary for shared links.
- `components/ui/OutfitMakerErrorBoundary.tsx`: React error boundary isolating canvas crashes.
- `app/not-found.tsx`: Minimalist luxury 404 page matching design tokens.

---

## 5. Security & Rate Limiting

- **Rate Limits (`lib/rateLimit.ts`)**:
  - Uploads: 10/min
  - Stylist: 5/min, 50/day
  - Share link creation: 10/min
  - Share link read: 60/min per IP
  - Auth (login/signup): 5/min per IP/email
- **Zod Schemas (`lib/validation/schemas.ts`)**: Strict validation on all incoming IDs, updates, and payloads.
- **Security Headers (`next.config.ts`)**: HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, and CSP in Report-Only mode.
- **Observability (`lib/logger.ts`)**: Structured JSON logs with request correlation IDs and PII redaction.
