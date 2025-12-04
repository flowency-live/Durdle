import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Durdle - Dorset's Premier Transfer Service",
  description: "Reliable, modern transfers across the Dorset coast. From airport runs to business travel - we get you there on time, every time.",
  icons: {
    icon: [
      { url: "/durdle-logo-transparent.png" },
      { url: "/durdle-logo-transparent.png", sizes: "32x32", type: "image/png" },
      { url: "/durdle-logo-transparent.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/durdle-logo-transparent.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/durdle-logo-transparent.png",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Durdle",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
