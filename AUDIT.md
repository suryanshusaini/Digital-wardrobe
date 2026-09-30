# Digital Wardrobe — Audit Report

**Date:** 2026-10-01  
**Auditor:** Antigravity AI  
**Scope:** 3D Podium, Gallery, Design System, Performance, Security, all app modules

---

## 3D Podium — Root Causes of Visual Oddities

### 1. Texture aspect ratio not normalised (Critical)
`ClothingPlate` (now `ClothingCard`) hard-codes two sizes: `1.7 × 2.15` for the selected item and `1.45 × 1.82` for others. Cloudinary uploads are saved as-is with no background removal (Photoroom removed). A landscape JPEG applied to a portrait card stretches horizontally; a portrait JPEG on a wider card letterboxes with visible background colour. **Fix:** uniform `CARD_W = 1.4, CARD_H = 2.0` for all items, with UV repeat/offset computed from the texture's natural dimensions to simulate `object-fit: cover`.

### 2. DepthOfField blurs the front item, not the back ones
`focalLength: 0.02` with `focusDistance: 0.0` references the camera origin, not the card geometry. The front card (closest to camera at z ≈ 3) ends up partially out of focus and the blurring is uniform across the scene. **Fix:** raise `focusDistance` to match front item distance, or — better — remove the DoF pass (it's the only `EffectComposer` pass; removing it eliminates the compositor overhead entirely) and rely on fog + contact shadows for depth cues.

### 3. Spotlight intensity jumps instantly on selection
`intensity={selectedId ? 2.2 : 1.4}` flips in a single frame, creating a hard brightness flash. **Fix:** store current intensity in a `useRef` and `THREE.MathUtils.damp` toward the target each frame.

### 4. Auto-rotation conflicts with OrbitControls
The carousel `group.rotation.y` is incremented by `useFrame` while `OrbitControls` also writes `camera` rotation. When the user drags and releases, the carousel resumes mid-rotation causing a snap. **Fix:** detect OrbitControls `onChange` → pause auto-rotation for ~2 s after last drag, or disable OrbitControls and use pointer-delta on the canvas for manual rotation only.

### 5. `antialias: false` + `multisampling: 0`
Edge aliasing is visible on rounded card corners, especially on DPR 2 displays. The combination of no MSAA and no SMAA/FXAA produces jagged silhouettes. **Fix:** `antialias: true` — the DPR cap at 2 already limits GPU cost; EffectComposer removal means no conflict with `multisampling`.

### 6. No texture size limit on Cloudinary URLs in podium
`optimizeCloudinaryUrl` only adds `f_auto,q_auto` — no width constraint. A 4000×5000 JPEG upload is loaded directly into WebGL VRAM as a full-resolution texture. **Fix:** new `podiumCloudinaryUrl()` export adds `w_1024,h_1024,c_fit`.

### 7. `THREE.Cache.clear()` on unmount but no `texture.dispose()`
Individual GPU textures are never explicitly released. `THREE.Cache.clear()` clears the CPU-side fetch cache but GPU VRAM allocated by the renderer is not freed until the renderer is disposed. **Fix:** collect textures in a ref and call `texture.dispose()` inside `useEffect` cleanup.

### 8. No `prefers-reduced-motion` support
Carousel rotates continuously regardless of OS accessibility settings. **Fix:** read `window.matchMedia('(prefers-reduced-motion: reduce)')` on mount and disable auto-rotation.

### 9. `frameloop="always"` wastes GPU when idle
The canvas renders at 60fps whenever in-view, even if nothing is animating. **Fix:** switch to `frameloop="demand"` and call `invalidate()` only on interaction/animation ticks.

---

## Gallery Issues

### 10. Double fetch on mount in `app/page.tsx`
Both a `useEffect` inline `load()` and a `fetchItems` useCallback fire on the initial mount. `handleUploadComplete` calls `fetchItems()` after already receiving the new item from the upload response. **Fix:** remove duplicate `useEffect`; `fetchItems` is only used for the manual refresh.

### 11. `object-contain p-3` on ItemCard images
Shows the raw photo background (now non-transparent). **Fix:** change to `object-cover` for a clean card crop.

### 12. `console.log` in production on every GET /api/items request
Logs `[GET /api/items] Found X items for user: email`. **Fix:** guard with `process.env.NODE_ENV !== 'production'`.

---

## Design System Gaps

### 13. No shadow, radius, or motion tokens in `@theme`
Headings and surfaces use inline Tailwind classes with no design-token abstraction. **Fix:** add `--shadow-*`, `--radius-*`, `--duration-*`, `--ease-*` tokens to `@theme inline`.

### 14. No global `:focus-visible` ring
Several interactive elements use `focus:outline-none` suppressing keyboard indicators. **Fix:** add a global `:focus-visible` rule and remove the suppressions.

### 15. `scroll-behavior: smooth` on `body`
Interferes with Framer Motion page transitions in some browsers. **Fix:** remove from body; apply only where explicitly needed.

---

## Security / Production Gaps

### 16. No rate limiting on upload, stylist, or share routes
Any authenticated user can spam these expensive endpoints. **Fix:** simple in-memory sliding-window rate limiter (no Redis dependency).

### 17. No security headers in `next.config.ts`
No CSP, X-Frame-Options, Referrer-Policy, or X-Content-Type-Options. **Fix:** add `headers()` function.

### 18. Share page has no `noindex` metadata
Public share pages are client-rendered with no `robots: noindex`. **Fix:** add a `<meta name="robots" content="noindex,nofollow">` tag.

### 19. No 404 page or root loading page
`next build` warns when these are missing. **Fix:** add `app/not-found.tsx` and `app/loading.tsx`.

---

## Scope: All Modules
- **Share page (`app/share/[token]/page.tsx`)**: Good structure. Needs noindex, polish.
- **Login/Signup**: Good error states already exist. Need focus-visible rings and polish.
- **Analytics**: Good Server Component. Bars are static CSS widths — animate with CSS `transition` on mount via a `@keyframes` delay trick.
- **AI Stylist endpoint**: No rate limiting. Add.
- **Outfit Maker**: No changes to logic; focus-visible and touch states only.
