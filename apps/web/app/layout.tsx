import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Nostalgia - Encrypted Photo Management",
  description:
    "An encrypted, intelligent, open-source photo management platform. Your memories, your privacy.",
  keywords: [
    "photos",
    "encrypted",
    "privacy",
    "open-source",
    "AI",
    "photo management",
  ],
};

async function getInitialToken(): Promise<string | null> {
  // Only attempt to get token on server if auth-server is configured.
  // Use server env fallbacks so local dev works even if only CONVEX_* are set.
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
    const convexSiteUrl =
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? process.env.CONVEX_SITE_URL;
    if (!convexUrl || !convexSiteUrl) return null;

    const { getToken } = await import("@/lib/auth-server");
    return (await getToken()) ?? null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getInitialToken();
  // Convex URL is not a secret; passing it from server -> client makes the app
  // work even when developers only configured CONVEX_URL in `.env.local`.
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? null;

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers initialToken={token} convexUrl={convexUrl}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
