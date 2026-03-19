import type { Metadata } from "next";
import { IBM_Plex_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/providers/theme-provider";

const uiSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ui-sans",
  weight: ["400", "500", "600", "700"],
});

const displaySerif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${uiSans.variable} ${displaySerif.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers initialToken={token} convexUrl={convexUrl}>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
