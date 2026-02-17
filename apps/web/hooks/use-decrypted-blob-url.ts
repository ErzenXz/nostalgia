"use client";

import { useEffect, useState } from "react";
import { decryptBlob } from "@/lib/encryption";
import { useEncryption } from "@/components/providers/encryption-provider";
import {
  getCachedThumbnail,
  setCachedThumbnail,
} from "@/lib/thumbnail-cache";

type CacheEntry = { url: string; expiresAt: number };

const decryptedUrlCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string>>();

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 500;

function evictIfNeeded() {
  if (decryptedUrlCache.size <= MAX_CACHE_ENTRIES) return;

  const targetSize = Math.floor(MAX_CACHE_ENTRIES * 0.8);
  while (decryptedUrlCache.size > targetSize) {
    const oldestKey = decryptedUrlCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const entry = decryptedUrlCache.get(oldestKey);
    if (entry) URL.revokeObjectURL(entry.url);
    decryptedUrlCache.delete(oldestKey);
  }
}

export function useDecryptedBlobUrl({
  cacheKey,
  signedUrl,
  mimeType,
  enabled = true,
}: {
  cacheKey: string | null | undefined;
  signedUrl: string | null | undefined;
  mimeType?: string;
  enabled?: boolean;
}): string | null {
  const { encryptionKey } = useEncryption();
  const [url, setUrl] = useState<string | null>(() => {
    if (!enabled || !cacheKey) return null;
    const cached = decryptedUrlCache.get(cacheKey);
    return cached && cached.expiresAt > Date.now() ? cached.url : null;
  });

  useEffect(() => {
    if (!enabled || !cacheKey || !signedUrl) {
      setUrl(null);
      return;
    }
    if (!encryptionKey) {
      setUrl(null);
      return;
    }

    // Check memory cache first
    const cached = decryptedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url);
      return;
    }

    let cancelled = false;

    const existing = inFlight.get(cacheKey);
    const task =
      existing ??
      (async () => {
        // Check IndexedDB cache for thumbnails
        const idbBlob = await getCachedThumbnail(cacheKey).catch(() => null);
        if (idbBlob) {
          const objectUrl = URL.createObjectURL(idbBlob);
          decryptedUrlCache.set(cacheKey, {
            url: objectUrl,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          evictIfNeeded();
          return objectUrl;
        }

        // Fetch and decrypt
        const res = await fetch(signedUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch encrypted blob: ${res.status}`);
        }
        const encrypted = await res.arrayBuffer();
        const decrypted = await decryptBlob(encrypted, encryptionKey, mimeType);
        const objectUrl = URL.createObjectURL(decrypted);

        decryptedUrlCache.set(cacheKey, {
          url: objectUrl,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        evictIfNeeded();

        // Persist thumbnail to IndexedDB (fire-and-forget, only for small blobs < 500KB)
        if (decrypted.size < 500 * 1024) {
          setCachedThumbnail(cacheKey, decrypted).catch(() => {});
        }

        return objectUrl;
      })();

    if (!existing) {
      inFlight.set(cacheKey, task);
    }

    task
      .then((objectUrl) => {
        if (!cancelled) setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (inFlight.get(cacheKey) === task) inFlight.delete(cacheKey);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, signedUrl, encryptionKey, mimeType, enabled]);

  return url;
}
