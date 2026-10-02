import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const runtime = "nodejs";
export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f7f5",
        }}
      >
        {/* Subtle border frame */}
        <div
          style={{
            position: "absolute",
            inset: "40px",
            border: "1px solid rgba(214,211,209,0.6)",
            borderRadius: "32px",
          }}
        />

        {/* Hanger mark SVG rendered inline */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1c1917"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: "28px" }}
        >
          <path d="M12 2 C12 2 13.5 2 13.5 3.5 C13.5 4.8 12 5.2 12 5.2" />
          <path d="M12 5.2 C12 5.2 8 6.5 4.5 10" />
          <path d="M12 5.2 C12 5.2 16 6.5 19.5 10" />
          <path d="M4.5 10 L3.5 17.5" />
          <path d="M19.5 10 L20.5 17.5" />
          <path d="M3.5 17.5 L20.5 17.5" />
          <circle cx="12" cy="13" r="1.2" fill="#b85d3b" />
        </svg>

        {/* Eyebrow */}
        <p
          style={{
            fontSize: "13px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#78716c",
            marginBottom: "12px",
            fontWeight: 500,
          }}
        >
          DIGITAL
        </p>

        {/* Wordmark */}
        <h1
          style={{
            fontSize: "84px",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            color: "#1c1917",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Wardrobe
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: "20px",
            color: "#78716c",
            marginTop: "20px",
            fontWeight: 400,
          }}
        >
          {BRAND_TAGLINE}
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
