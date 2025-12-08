import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const knockoutSumo = localFont({
  src: "./fonts/KnockoutHTF54-Sumo.otf",
  variable: "--font-knockout",
  weight: "400",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Dorset Transfer Company - Professional Transfer Service",
  description: "Reliable, modern transfers across Dorset and beyond. From airport runs to business travel - we get you there on time, every time.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    statusBarStyle: "default",
    title: "Durdle",
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://durdle.co.uk",
    siteName: "The Dorset Transfer Company",
    title: "The Dorset Transfer Company - Professional Transfer Service",
    description: "Reliable, modern transfers across Dorset and beyond. From airport runs to business travel - we get you there on time, every time.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Durdle - Dorset Transfer Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Dorset Transfer Company - Professional Transfer Service",
    description: "Reliable, modern transfers across Dorset and beyond. From airport runs to business travel - we get you there on time, every time.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${knockoutSumo.variable} ${playfairDisplay.variable} antialiased`}
      >
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
