import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import Footer from "@/components/layout/Footer";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_SHORT_NAME } from "@/lib/brand";

// Geist fonts served locally — avoids build-time Google Fonts network fetch
const geistSans = localFont({
  src: "../public/fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "../public/fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

// Cormorant Garamond — editorial serif headings. The woff2 subset contains
// weight 400; browsers will synthesise lighter/bolder from this glyph set.
// Declared as "300 500" so font-light (300) assignments resolve correctly
// without a separate 300 WOFF2 download.
const headingSerif = localFont({
  src: "../public/fonts/cormorant-garamond-latin.woff2",
  variable: "--font-heading-serif",
  weight: "300 500",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://digital-wardrobe.vercel.app"),
  title: {
    default: BRAND_NAME,
    template: `%s — ${BRAND_NAME}`,
  },
  description: BRAND_TAGLINE,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND_SHORT_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Light/dark variants — keeps meta themeColor in sync with the CSS theme
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

// Inline script executed synchronously in <head> to prevent theme flash (FOUC)
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${headingSerif.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full min-h-dvh flex-col antialiased bg-background text-foreground">
        <Providers>
          <div className="flex-1 flex flex-col">{children}</div>
          <Footer />
          {/* AccountIndicator moved into page.tsx header avatar menu */}
        </Providers>
      </body>
    </html>
  );
}
