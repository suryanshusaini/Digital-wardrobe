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
