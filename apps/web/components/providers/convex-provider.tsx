"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { authClient } from "@/lib/auth-client";

const envConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

/**
 * Context to indicate whether the Convex provider is available in the tree.
 * During static builds (no NEXT_PUBLIC_CONVEX_URL), this is false,
 * so hooks can short-circuit instead of crashing.
 */
const ConvexAvailableContext = createContext(false);

export function useConvexAvailable() {
  return useContext(ConvexAvailableContext);
}

export function ConvexClientProvider({
  children,
  initialToken,
  convexUrl,
}: {
  children: ReactNode;
  initialToken?: string | null;
  convexUrl?: string | null;
}) {
  const url = convexUrl ?? envConvexUrl ?? null;

  const client = useMemo(() => {
    if (!url) return null;
    return new ConvexReactClient(url);
  }, [url]);

  if (!client) {
    // During build or when Convex URL is not configured, render children without provider
    return (
      <ConvexAvailableContext.Provider value={false}>
        {children}
      </ConvexAvailableContext.Provider>
    );
  }

  return (
    <ConvexAvailableContext.Provider value={true}>
      <ConvexBetterAuthProvider
        client={client}
        authClient={authClient}
        initialToken={initialToken}
      >
        {children}
      </ConvexBetterAuthProvider>
    </ConvexAvailableContext.Provider>
  );
}
