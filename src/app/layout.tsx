import type { Metadata, Viewport } from "next";
import {
  Barlow_Condensed,
  Bebas_Neue,
  Figtree,
  JetBrains_Mono,
} from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

const logo = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Always On",
  description:
    "Track music, TV, movies, podcasts, and books — plus friend recommendations.",
  applicationName: "Always On",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Always On",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#05080d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${logo.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
