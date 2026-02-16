"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Cache for presigned download URLs.
 * Keys are storage keys, values are { url, expiresAt }.
 * URLs are cached for 50 minutes (presigned URLs expire in 60min).
 */
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL = 50 * 60 * 1000; // 50 minutes

/**
 * Fetches a presigned download URL for a storage key from our API.
 */
async function fetchDownloadUrl(
  storageKey: string,
  bucket?: string,
): Promise<string> {
  const cached = urlCache.get(storageKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const params = new URLSearchParams({ key: storageKey });
  if (bucket) params.set("bucket", bucket);

  const res = await fetch(`/api/storage?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to get download URL: ${res.status}`);
  }

  const { downloadUrl } = await res.json();
  urlCache.set(storageKey, {
    url: downloadUrl,
    expiresAt: Date.now() + CACHE_TTL,
  });
  return downloadUrl;
}

/**
 * Hook to get a presigned download URL for a photo's storage key.
 * Returns the URL string or null while loading.
 */
export function usePhotoUrl(
  storageKey: string | undefined | null,
): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!storageKey) return null;
    const cached = urlCache.get(storageKey);
    return cached && cached.expiresAt > Date.now() ? cached.url : null;
  });
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setUrl(null);
      return;
    }

    let cancelled = false;

    // Check cache first (synchronous)
    const cached = urlCache.get(storageKey);
    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url);
      return;
    }

    fetchDownloadUrl(storageKey)
      .then((downloadUrl) => {
        if (!cancelled) {
          setUrl(downloadUrl);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  return url;
}

/**
 * Hook to batch-fetch presigned URLs for multiple storage keys.
 * Returns a Map<storageKey, url>.
 */
export function usePhotoUrls(storageKeys: string[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const keysRef = useRef<string[]>([]);

  useEffect(() => {
    // Dedupe: only re-fetch if keys actually changed
    const sortedKeys = [...storageKeys].sort();
    const prevSorted = [...keysRef.current].sort();
    if (JSON.stringify(sortedKeys) === JSON.stringify(prevSorted)) return;
    keysRef.current = storageKeys;

    if (storageKeys.length === 0) {
      setUrls(new Map());
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      const result = new Map<string, string>();
      const toFetch: string[] = [];

      // Fill from cache first
      for (const key of storageKeys) {
        const cached = urlCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
          result.set(key, cached.url);
        } else {
          toFetch.push(key);
        }
      }

      // Fetch remaining in parallel (with concurrency limit)
      const BATCH_SIZE = 10;
      for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
        const batch = toFetch.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((key) =>
            fetchDownloadUrl(key).then((url) => ({ key, url })),
          ),
        );
        for (const r of results) {
          if (r.status === "fulfilled") {
            result.set(r.value.key, r.value.url);
          }
        }
      }

      if (!cancelled) {
        setUrls(new Map(result));
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [storageKeys]);

  return urls;
}

export { fetchDownloadUrl };
