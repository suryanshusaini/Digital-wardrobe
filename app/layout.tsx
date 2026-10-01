import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import AccountIndicator from "@/components/layout/AccountIndicator";
import Footer from "@/components/layout/Footer";

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

const headingSerif = localFont({
  src: "../public/fonts/cormorant-garamond-latin.woff2",
  variable: "--font-heading-serif",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Wardrobe",
  description: "Your personal digital closet",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My Wardrobe",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f7f5",
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
          <AccountIndicator />
        </Providers>
      </body>
    </html>
  );
}
