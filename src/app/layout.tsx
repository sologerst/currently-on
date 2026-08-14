import type { Metadata, Viewport } from "next";
import { Baloo_2, IBM_Plex_Mono, Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const display = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Currently On",
  description:
    "Track music, TV, movies, podcasts, and books — plus friend recommendations.",
  applicationName: "Currently On",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Currently On",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#14161A]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
