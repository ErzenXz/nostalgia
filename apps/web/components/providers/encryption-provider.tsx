"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  generateEncryptionKey,
  getStoredEncryptionKey,
  storeEncryptionKey,
} from "@/lib/encryption";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useConvexAvailable } from "@/components/providers/convex-provider";

interface EncryptionContextValue {
  encryptionKey: CryptoKey | null;
  isReady: boolean;
  initializeEncryption: (userId: string) => Promise<CryptoKey>;
}

const EncryptionContext = createContext<EncryptionContextValue>({
  encryptionKey: null,
  isReady: false,
  initializeEncryption: async () => {
    throw new Error("EncryptionProvider not found");
  },
});

/**
 * Inner provider that uses Convex hooks (useCurrentUser) to auto-initialize
 * encryption when user is authenticated. Only rendered when Convex is available.
 */
function EncryptionProviderWithAuth({ children }: { children: ReactNode }) {
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { userId, isAuthenticated } = useCurrentUser();

  const initializeEncryption = useCallback(
    async (userIdStr: string): Promise<CryptoKey> => {
      // Try to get existing key from IndexedDB
      let key = await getStoredEncryptionKey(userIdStr);

      if (!key) {
        // Generate new encryption key
        key = await generateEncryptionKey();
        await storeEncryptionKey(userIdStr, key);
      }

      setEncryptionKey(key);
      setIsReady(true);
      return key;
    },
    [],
  );

  // Auto-initialize encryption when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userId && !encryptionKey) {
      initializeEncryption(userId).catch(console.error);
    }
  }, [isAuthenticated, userId, encryptionKey, initializeEncryption]);

  return (
    <EncryptionContext.Provider
      value={{ encryptionKey, isReady, initializeEncryption }}
    >
      {children}
    </EncryptionContext.Provider>
  );
}

/**
 * Fallback provider when Convex is not available (e.g. during static build).
 * Provides the context with default values — encryption won't auto-initialize.
 */
function EncryptionProviderFallback({ children }: { children: ReactNode }) {
  const initializeEncryption = useCallback(async (): Promise<CryptoKey> => {
    throw new Error("Convex not available — cannot initialize encryption");
  }, []);

  return (
    <EncryptionContext.Provider
      value={{ encryptionKey: null, isReady: false, initializeEncryption }}
    >
      {children}
    </EncryptionContext.Provider>
  );
}

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const convexAvailable = useConvexAvailable();

  if (convexAvailable) {
    return <EncryptionProviderWithAuth>{children}</EncryptionProviderWithAuth>;
  }

  return <EncryptionProviderFallback>{children}</EncryptionProviderFallback>;
}

export function useEncryption() {
  return useContext(EncryptionContext);
}
