# Digital Wardrobe — Developer & AI Context Guide

This document provides a comprehensive technical map of the Digital Wardrobe codebase for AI assistants and developers.

---

## 1. Project Overview

Digital Wardrobe is a personal closet application that transforms clothing photos into studio-grade flat-lay cutouts, stages them on an interactive canvas to save outfits, displays items on a 3D architectural showcase podium, and provides a multi-user digital closet experience.

### Core Feature Areas
- **Gallery View (`app/page.tsx`)**: Categorized horizontal snap-scroll rows (Tops, Bottoms, Shoes, Accessories) with clean hover overlays for item editing and cascading deletion.
- **Outfit Maker (`components/ui/OutfitMaker.tsx`)**: Drag-and-drop canvas powered by Framer Motion. Desktop features a collapsible sidebar; mobile features an accessible slide-up bottom drawer.
- **Saved Outfits ("My Outfits", `components/ui/SavedOutfits.tsx`)**: Gallery of saved outfits with normalized fixed-box item thumbnail rows, read-only detail view, inline renaming, and edit-in-canvas loading.
- **Top Picks ("Recently Added", `app/page.tsx`)**: Clean horizontal row of flat image cards displaying the user's 5 most recent pieces with hover lift and item name labels.
- **Upload Pipeline (`app/api/upload/route.ts`)**: Direct-to-Cloudinary image upload pipeline with no background removal processing, storing references and metadata in MongoDB.
- **AI Auto-Categorization (`app/api/categorize/route.ts`)**: Gemini Flash Vision categorization with pattern/keyword fallback heuristics.

### Technology Stack
- **Framework**: Next.js 16.3.5 (App Router with Turbopack / Next.js 16 conventions)
- **Language & Runtime**: TypeScript 5, React 19.2.8, Node.js
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) with CSS variables in `app/globals.css`
- **Authentication**: NextAuth.js v5 (`next-auth@5.0.0-beta.32` / Auth.js) with Google OAuth provider
- **Database & ODM**: MongoDB with Mongoose 9.10.0 (connection helper in `lib/db/mongodb.ts`)
- **Image Storage**: Cloudinary (`cloudinary` v2.11.0) for remote asset hosting
- **Motion & UI**: Framer Motion 13.2.0, Lucide React 1.45.0

---

## 2. Authentication & Multi-User Architecture

### Auth Stack & Configuration
- **Root Auth Config**: `auth.ts` exports `{ handlers, auth, signIn, signOut }` using `GoogleProvider`. Configured with `session` callback to ensure `session.user.id = token.sub`.
- **Catch-all API Route**: `app/api/auth/[...nextauth]/route.ts` imports and re-exports `{ GET, POST }` from `@/auth`.
- **Auth Gate (`proxy.ts`)**: In Next.js 16, `proxy.ts` replaces the deprecated `middleware.ts`. It wraps `auth()` and redirects unauthenticated users to `/login`. Matches all routes except `_next/static`, `_next/image`, `favicon.ico`, `icon`, `api/auth`, and `login`.
- **Client Provider**: `components/Providers.tsx` wraps the app layout in `<SessionProvider>` to enable client-side `useSession()`.

### Account Indicator UI
- **Location**: `components/layout/AccountIndicator.tsx` rendered in `app/layout.tsx`.
- **Placement**: Fixed at the bottom-left of the viewport (`fixed bottom-5 left-5 z-40 sm:bottom-6 sm:left-6`) as a subtle, low-contrast footer element that does not compete with the top navigation bar.
- **Trigger**: Displays user's Google profile image (or first-initial fallback) and first name inside a translucent pill (`bg-white/90 border-stone-200/70`).
- **Popover**: Animated Framer Motion dropdown showing full name, Google email, and a "Sign out" action calling `signOut({ callbackUrl: "/login" })`. Dismisses on click-outside or `Escape`.

### Data Scoping & Multi-User Isolation Status
- **Status**: **VERIFIED & IMPLEMENTED**.
- **User Identifier**: All items and outfits are scoped to `session.user.email` (with `session.user.id` fallback).
- **Protected Routes & Queries**:
  - `GET /api/items`: Checks `await auth()`; queries `Item.find({ $or: [{ userId: userEmail }, { userId: session.user.id }] })`. Auto-claims legacy unassigned development items for the active user so existing wardrobe items are not lost.
  - `DELETE /api/items/[id]`: Checks `await auth()`; verifies item ownership before deletion; cascades removal from user's outfits.
  - `PATCH /api/items/[id]`: Checks `await auth()`; restricts updates to items owned by the session user.
  - `POST /api/upload`: Checks `await auth()`; stamps `userId: session.user.email` onto the newly created `Item`.
  - `GET /api/outfits`: Checks `await auth()`; queries `Outfit.find({ $or: [{ userId: userEmail }, { userId: session.user.id }] })`.
  - `POST /api/outfits`: Checks `await auth()`; assigns `userId: session.user.email` upon creation.
  - `GET /api/outfits/[id]`, `DELETE /api/outfits/[id]`, `PATCH /api/outfits/[id]`: All verify ownership against the active session.

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

---

## 4. Design System & Conventions

### Color Palette
- **Canvas / App Background**: `#f8f7f5` (soft warm stone background)
- **Cards & Surfaces**: `#ffffff` with subtle borders (`border-stone-100` or `border-stone-200/70`)
- **Accent Color System** (declared in `app/globals.css`):
  - `--accent`: `#b85d3b` (warm terracotta)
  - `--accent-hover`: `#a04e2f`
  - `--accent-light`: `#fbf1ec`
  - `--accent-foreground`: `#ffffff`
- **Text**: `text-stone-900` (primary headings), `text-stone-700` (body/pills), `text-stone-400` (subtitles/metadata)

### Typography & Fonts
- **Geist Sans & Geist Mono**: Stored locally in `public/fonts/` and initialized in `app/layout.tsx`. No external Google Fonts network calls are made during build or runtime.

### Micro-Interactions & Motion
- **Card Hover**: Cards feature `whileHover={{ scale: 1.02, y: -3 }}` with an amber-tinted shadow (`box-shadow: 0 12px 28px rgba(184,93,59,0.12)...`) transitioning over 180ms ease-out.
- **Staggered Entrance**: Gallery category items and Saved Outfits cards apply a staggered delay (`delay: Math.min(index * 0.05, 0.4)`).
- **Tab Switching**: Content sections switch with soft fade/slide transitions (`opacity: 0 → 1, y: 14 → 0`).

### Next.js 16 Architectural Rules
- **Proxy**: Routing guards and auth gating use `proxy.ts`, NOT `middleware.ts`.
- **Dynamic Route Params**: Dynamic route context parameters are Promises and must be awaited:
  ```ts
  export async function GET(req: NextRequest, ctx: RouteContext<"/api/items/[id]">) {
    const { id } = await ctx.params;
  }
  ```

---

## 5. Known Status & Outstanding Verification Items

| Feature Area | Current Status | Notes / Next Verification Steps |
|---|---|---|
| **Google Authentication** | ✅ Working | NextAuth v5 with GoogleProvider and `proxy.ts` auth gate. |
| **Account Indicator** | ✅ Working | Fixed bottom-left chip with avatar, name, and sign-out popover. |
| **Data Isolation** | ✅ Implemented | `userId` added to schemas and checked across all endpoints. **TODO**: Perform live multi-account test with two separate Google accounts to double-check isolation in production MongoDB. |
| **Item Edit & Delete** | ✅ Working | EditModal for tag updates; 2-step delete confirm; cascading outfit reference cleanup. |
| **Saved Outfits** | ✅ Working | Normalized fixed-box thumbnails, read-only detail view, load into Outfit Maker. |
| **Top Picks View** | ✅ Working | Static horizontal row of recent pieces with item cards and clean labels. |
| **Auto-Categorization** | ✅ Working | Gemini Vision + regex fallback in `/api/categorize`. Requires `GEMINI_API_KEY` for AI classification. |
| **Mobile Responsiveness** | ✅ Implemented | Outfit Maker bottom sheet drawer, scrollable navigation bar, and responsive upload card. Further testing across diverse mobile browser viewports is recommended. |
| **Masonry Gallery View** | ⚠️ Optional Polish | Currently uses horizontal snap-scroll category rows; vertical Pinterest-style masonry layout could be added as an alternate toggle. |

---

## 6. Key Environment Variables

Ensure the following environment variables are configured in `.env.local`:

```env
# Database
MONGODB_URI=mongodb+srv://...

# Auth (NextAuth v5)
AUTH_SECRET=...
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Image Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# AI Categorization (Optional / Gemini)
GEMINI_API_KEY=...
```
