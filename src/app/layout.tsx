import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bn" });

export const metadata: Metadata = {
  title: "ClipForge — AI Video Studio",
  description:
    "Edit, generate, and split videos like a pro. CapCut-style editor, AI video & image generation, long→short serial splitter, exports from SD 480p to UHD 4K.",
  manifest: "/manifest.webmanifest",
  applicationName: "ClipForge",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: "ClipForge",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07060d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${bengali.variable}`}>
      <body className="min-h-screen bg-[#07060d] text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
