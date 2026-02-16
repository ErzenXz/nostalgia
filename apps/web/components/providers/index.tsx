"use client";

import { Toaster } from "sonner";
import { ConvexClientProvider } from "./convex-provider";
import { EncryptionProvider } from "./encryption-provider";
import { type ReactNode } from "react";

export function Providers({
  children,
  initialToken,
  convexUrl,
}: {
  children: ReactNode;
  initialToken?: string | null;
  convexUrl?: string | null;
}) {
  return (
    <ConvexClientProvider initialToken={initialToken} convexUrl={convexUrl}>
      <EncryptionProvider>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111113",
              border: "1px solid #27272a",
              color: "#fafafa",
            },
          }}
        />
      </EncryptionProvider>
    </ConvexClientProvider>
  );
}
