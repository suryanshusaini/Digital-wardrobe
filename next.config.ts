import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // intentional — avoids double-invocation with Framer Motion + R3F
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer data
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions Policy — disable unused browser APIs
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content Security Policy
          // Allowlist: self + Cloudinary (images) + Google APIs (Gemini) + NextAuth (Google OAuth)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: self + Next.js inline scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Styles: self + inline (Tailwind v4 injects styles)
              "style-src 'self' 'unsafe-inline'",
              // Images: self + Cloudinary + data URIs (blur placeholders) + lh3 (Google avatars)
              "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com",
              // Fonts: self
              "font-src 'self'",
              // Connect: self + Cloudinary + Gemini API + NextAuth endpoints
              "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com https://generativelanguage.googleapis.com https://accounts.google.com",
              // Frames: none (no iframes needed)
              "frame-src 'none'",
              // Workers for Three.js / R3F WASM
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
