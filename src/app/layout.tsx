import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import ClientErrors from "@/components/ClientErrors";
import FeedbackWidget from "@/components/FeedbackWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voice Todo",
  description: "Ghi công việc bằng giọng nói tiếng Việt trên điện thoại.",
  applicationName: "Voice Todo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Voice Todo",
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
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
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-slate-50 font-sans text-slate-900"
        suppressHydrationWarning
      >
        {children}
        <FeedbackWidget />
        <ClientErrors />
      </body>
    </html>
  );
}
