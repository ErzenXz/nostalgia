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
  createRecoveryPackage,
  deleteStoredEncryptionKey,
  exportKey,
  generateEncryptionKey,
  getStoredEncryptionKey,
  hashKey,
  importKey,
  importKeyFromRecoveryPackage,
  storeEncryptionKey,
} from "@/lib/encryption";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useConvexAvailable } from "@/components/providers/convex-provider";
import { useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";

interface EncryptionContextValue {
  encryptionKey: CryptoKey | null;
  hasEncryptionKey: boolean;
  isLoading: boolean;
  isReady: boolean;
  initializeEncryption: (userId: string) => Promise<CryptoKey | null>;
  setupNewEncryptionKey: () => Promise<{ key: string }>;
  importEncryptionKey: (keyString: string) => Promise<void>;
  recoverEncryptionKey: (packageJson: string, passphrase: string) => Promise<void>;
  exportCurrentEncryptionKey: () => Promise<string>;
  createRecoveryBundle: (passphrase: string) => Promise<string>;
  forgetLocalEncryptionKey: () => Promise<void>;
}

const EncryptionContext = createContext<EncryptionContextValue>({
  encryptionKey: null,
  hasEncryptionKey: false,
  isLoading: true,
  isReady: false,
  initializeEncryption: async () => {
    throw new Error("EncryptionProvider not found");
  },
  setupNewEncryptionKey: async () => {
    throw new Error("EncryptionProvider not found");
  },
  importEncryptionKey: async () => {
    throw new Error("EncryptionProvider not found");
  },
  recoverEncryptionKey: async () => {
    throw new Error("EncryptionProvider not found");
  },
  exportCurrentEncryptionKey: async () => {
    throw new Error("EncryptionProvider not found");
  },
  createRecoveryBundle: async () => {
    throw new Error("EncryptionProvider not found");
  },
  forgetLocalEncryptionKey: async () => {
    throw new Error("EncryptionProvider not found");
  },
});

/**
 * Inner provider that uses Convex hooks (useCurrentUser) to auto-initialize
 * encryption when user is authenticated. Only rendered when Convex is available.
 */
function EncryptionProviderWithAuth({ children }: { children: ReactNode }) {
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const {
    user,
    userId,
    isAuthenticated,
    isLoading: isUserLoading,
  } = useCurrentUser();
  const updateEncryptionKey = useMutation(api.users.updateEncryptionKey);

  const storeAndSyncKey = useCallback(
    async (userIdStr: string, key: CryptoKey) => {
      const fingerprint = await hashKey(key);
      if (user?.encryptionKeyHash && user.encryptionKeyHash !== fingerprint) {
        throw new Error(
          "This key doesn't match your account encryption fingerprint.",
        );
      }

      await storeEncryptionKey(userIdStr, key);
      if (!user?.encryptionKeyHash) {
        await updateEncryptionKey({
          userId: userIdStr as never,
          encryptionKeyHash: fingerprint,
        });
      }

      setEncryptionKey(key);
    },
    [updateEncryptionKey, user?.encryptionKeyHash],
  );

  const initializeEncryption = useCallback(
    async (userIdStr: string): Promise<CryptoKey | null> => {
      setIsLoading(true);
      let key = await getStoredEncryptionKey(userIdStr);
      if (!key) {
        setEncryptionKey(null);
        setIsLoading(false);
        return null;
      }

      if (user?.encryptionKeyHash) {
        const fingerprint = await hashKey(key);
        if (fingerprint !== user.encryptionKeyHash) {
          await deleteStoredEncryptionKey(userIdStr);
          setEncryptionKey(null);
          setIsLoading(false);
          return null;
        }
      }

      setEncryptionKey(key);
      setIsLoading(false);
      return key;
    },
    [user?.encryptionKeyHash],
  );

  const setupNewEncryptionKey = useCallback(async (): Promise<{ key: string }> => {
    if (isUserLoading) throw new Error("Authentication is still loading");
    if (!userId) throw new Error("User not authenticated");
    const key = await generateEncryptionKey();
    await storeAndSyncKey(userId, key);
    return { key: await exportKey(key) };
  }, [isUserLoading, storeAndSyncKey, userId]);

  const importEncryptionKeyValue = useCallback(
    async (keyString: string): Promise<void> => {
      if (isUserLoading) throw new Error("Authentication is still loading");
      if (!userId) throw new Error("User not authenticated");
      const trimmed = keyString.trim();
      if (!trimmed) throw new Error("Encryption key is required");
      const key = await importKey(trimmed);
      await storeAndSyncKey(userId, key);
    },
    [isUserLoading, storeAndSyncKey, userId],
  );

  const recoverEncryptionKey = useCallback(
    async (packageJson: string, passphrase: string): Promise<void> => {
      if (isUserLoading) throw new Error("Authentication is still loading");
      if (!userId) throw new Error("User not authenticated");
      const key = await importKeyFromRecoveryPackage(packageJson, passphrase);
      await storeAndSyncKey(userId, key);
    },
    [isUserLoading, storeAndSyncKey, userId],
  );

  const exportCurrentEncryptionKey = useCallback(async (): Promise<string> => {
    if (!encryptionKey) throw new Error("No encryption key set");
    return await exportKey(encryptionKey);
  }, [encryptionKey]);

  const createRecoveryBundle = useCallback(
    async (passphrase: string): Promise<string> => {
      if (!encryptionKey) throw new Error("No encryption key set");
      const trimmed = passphrase.trim();
      if (!trimmed) throw new Error("Recovery passphrase is required");
      return await createRecoveryPackage(encryptionKey, trimmed);
    },
    [encryptionKey],
  );

  const forgetLocalEncryptionKey = useCallback(async (): Promise<void> => {
    if (isUserLoading) throw new Error("Authentication is still loading");
    if (!userId) throw new Error("User not authenticated");
    await deleteStoredEncryptionKey(userId);
    setEncryptionKey(null);
  }, [isUserLoading, userId]);

  // Auto-initialize encryption when user is authenticated
  useEffect(() => {
    if (isUserLoading) {
      setIsLoading(true);
      return;
    }

    if (isAuthenticated && userId) {
      initializeEncryption(userId).catch(() => {
        setEncryptionKey(null);
        setIsLoading(false);
      });
    } else {
      setEncryptionKey(null);
      setIsLoading(false);
    }
  }, [isUserLoading, isAuthenticated, userId, initializeEncryption]);

  const hasEncryptionKey = !!encryptionKey;
  const isReady = hasEncryptionKey;

  return (
    <EncryptionContext.Provider
      value={{
        encryptionKey,
        hasEncryptionKey,
        isLoading,
        isReady,
        initializeEncryption,
        setupNewEncryptionKey,
        importEncryptionKey: importEncryptionKeyValue,
        recoverEncryptionKey,
        exportCurrentEncryptionKey,
        createRecoveryBundle,
        forgetLocalEncryptionKey,
      }}
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
  const initializeEncryption = useCallback(async (): Promise<CryptoKey | null> => {
    throw new Error("Convex not available — cannot initialize encryption");
  }, []);

  const unsupported = useCallback(async () => {
    throw new Error("Convex not available — encryption actions unavailable");
  }, []);

  return (
    <EncryptionContext.Provider
      value={{
        encryptionKey: null,
        hasEncryptionKey: false,
        isLoading: false,
        isReady: false,
        initializeEncryption,
        setupNewEncryptionKey: unsupported,
        importEncryptionKey: unsupported,
        recoverEncryptionKey: unsupported,
        exportCurrentEncryptionKey: unsupported,
        createRecoveryBundle: unsupported,
        forgetLocalEncryptionKey: unsupported,
      }}
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
