import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono, Syne } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const display = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-code",
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
  themeColor: "#EEF1F4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
