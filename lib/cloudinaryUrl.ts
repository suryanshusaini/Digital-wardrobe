/** Inject Cloudinary auto-format / quality without duplicating transforms. */
export function optimizeCloudinaryUrl(url: string): string {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  if (url.includes("f_auto") && url.includes("q_auto")) {
    return url;
  }
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

/**
 * Cloudinary URL optimised for WebGL texture use:
 * - Produces w_768,h_1024,c_fill,g_auto,f_auto,q_auto (3:4 aspect to match 1.5x2.0 card)
 * - Server-side crop ensures texture arrives lightweight and pre-cropped
 * - Prevents loading 4K source images directly into GPU VRAM
 */
export function podiumCloudinaryUrl(url: string): string {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  // Avoid double-injecting
  if (url.includes("w_768")) {
    return url;
  }
  return url.replace("/upload/", "/upload/w_768,h_1024,c_fill,g_auto,f_auto,q_auto/");
}

/**
 * Extracts the Cloudinary public_id from a secure asset URL,
 * stripping transformations, version tags, and file extensions.
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) return null;
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;
    let path = url.slice(uploadIndex + "/upload/".length);
    path = path.split("?")[0].split("#")[0];
    const segments = path.split("/");
    const filtered = segments.filter((seg) => {
      if (seg.includes(",")) return false;
      if (/^[a-z]_[a-z0-9]+$/i.test(seg)) return false;
      if (/^v\d+$/.test(seg)) return false;
      return true;
    });
    if (filtered.length === 0) return null;
    const lastSeg = filtered[filtered.length - 1];
    const dotIndex = lastSeg.lastIndexOf(".");
    if (dotIndex !== -1) {
      filtered[filtered.length - 1] = lastSeg.slice(0, dotIndex);
    }
    return filtered.join("/");
  } catch {
    return null;
  }
}

