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
              background: "rgba(23, 19, 17, 0.96)",
              border: "1px solid rgba(205, 168, 107, 0.1)",
              color: "#f5f0e8",
              backdropFilter: "blur(8px)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
            },
          }}
        />
      </EncryptionProvider>
    </ConvexClientProvider>
  );
}
