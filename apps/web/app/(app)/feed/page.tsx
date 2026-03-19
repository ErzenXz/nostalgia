"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { useAiOptInForUserId } from "@/hooks/use-ai-opt-in";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Heart,
  ImageOff,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
} from "lucide-react";

interface FeedItem {
  photoId: string;
  takenAt: number | null;
  uploadedAt: number;
  mimeType?: string;
  reason: string;
  score: number;
  scoreBreakdown: { nostalgia: number; coherence: number };
  captionShort: string | null;
  aiTagsV2: string[] | null;
  locationName?: string | null;
  detectedFaces?: number | null;
}

type PhotoRecord = {
  _id: Id<"photos">;
  storageKey: string;
  thumbnailStorageKey?: string;
  mimeType: string;
  isEncrypted?: boolean;
  description?: string | null;
  fileName: string;
  takenAt?: number;
  uploadedAt: number;
  locationName?: string | null;
  isFavorite?: boolean;
};

const HOME_EMPTY_HINT =
  "Upload more photos and this home feed will start balancing fresh additions with your strongest older memories.";

function formatDuration(mimeType?: string) {
  if (mimeType?.startsWith("video/")) {
    return "0:00"; // Placeholder for video duration since it's not in the data model yet
  }
  return null;
}

function CardImage({
  storageKey,
  thumbnailStorageKey,
  mimeType,
  isEncrypted,
  alt,
}: {
  storageKey: string;
  thumbnailStorageKey?: string;
  mimeType: string;
  isEncrypted?: boolean;
  alt: string;
}) {
  const imageKey = thumbnailStorageKey || storageKey;
  const signedUrl = usePhotoUrl(imageKey);
  const isThumb = !!thumbnailStorageKey && imageKey === thumbnailStorageKey;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: isThumb ? "image/jpeg" : mimeType,
    enabled: !!isEncrypted,
  });

  const displayUrl = isEncrypted ? decryptedUrl : signedUrl;

  if (!displayUrl) {
    return <div className="absolute inset-0 bg-muted animate-pulse" />;
  }

  return (
    <Image
      src={displayUrl}
      alt={alt}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
      unoptimized
    />
  );
}

function FeedCard({
  item,
  photo,
  onFavorite,
}: {
  item: FeedItem;
  photo: PhotoRecord;
  onFavorite: (id: string) => void;
}) {
  const [liked, setLiked] = useState(photo?.isFavorite ?? false);
  if (!photo) return null;

  const isVideo = photo.mimeType?.startsWith("video/");
  const duration = formatDuration(photo.mimeType);
  const badgeLabel = item.reason.toLowerCase().includes("added")
    ? "Fresh upload"
    : item.score >= 0.9
      ? "Top pick"
      : "Rediscovered";

  return (
    <Link
      href={`/photos/${item.photoId}`}
      className="group block relative overflow-hidden rounded-xl bg-muted aspect-[3/4] w-full"
    >
      <CardImage
        storageKey={photo.storageKey}
        thumbnailStorageKey={photo.thumbnailStorageKey}
        mimeType={photo.mimeType}
        isEncrypted={photo.isEncrypted}
        alt={item.captionShort || photo.fileName}
      />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      {/* Top Right Duration or Match Score */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {duration ? (
          <span className="text-[12px] font-medium text-white drop-shadow-md">
            {duration}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-white/90 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md">
            Match {Math.round(item.score * 100)}%
          </span>
        )}
      </div>

      {/* Progress Bar (Decorative) */}
      {isVideo && (
        <div className="absolute top-4 left-4 right-16 h-1 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white w-1/3 rounded-full" />
        </div>
      )}

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-[11px] font-medium text-white/70 uppercase tracking-wider mb-1">
          {badgeLabel}
        </p>
        <h3 className="text-[16px] font-semibold text-white leading-tight mb-3 line-clamp-2">
          {item.captionShort ||
            photo.description ||
            photo.locationName ||
            photo.fileName}
        </h3>

        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden">
            {photo.locationName ? photo.locationName.charAt(0) : "U"}
          </div>
          <span className="text-[13px] font-medium text-white/90">
            {photo.locationName || "You"}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked(!liked);
              onFavorite(item.photoId);
            }}
            className="text-white hover:scale-110 transition-transform"
          >
            <Heart
              className={cn(
                "h-5 w-5",
                liked ? "fill-white text-white" : "text-white",
              )}
            />
          </button>
        </div>
      </div>
    </Link>
  );
}

function FeedCardSkeleton() {
  return (
    <div className="relative aspect-[3/4] w-full rounded-xl bg-muted animate-pulse overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
        <div className="h-3 w-24 bg-white/20 rounded" />
        <div className="h-5 w-3/4 bg-white/20 rounded" />
        <div className="flex items-center gap-2 pt-2">
          <div className="h-6 w-6 rounded-full bg-white/20" />
          <div className="h-4 w-20 bg-white/20 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [seed] = useState(() => crypto.randomUUID());
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const feedCursorRef = useRef<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const { userId, isLoading: userLoading } = useCurrentUser();
  const { aiOptIn, isLoading: aiLoading } = useAiOptInForUserId(
    userId as Id<"users"> | null,
  );
  const getNostalgiaFeed = useAction(api.feed.nostalgia.getNostalgiaFeed);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);

  const aiProgress = useQuery(
    api.users.getAiProgress,
    userId && aiOptIn === true ? { userId } : "skip",
  );

  const aiReady =
    aiOptIn === true &&
    !!aiProgress &&
    aiProgress.total > 0 &&
    !aiProgress.isComplete &&
    aiProgress.pending > 0;

  const mergeUnique = useCallback((prev: FeedItem[], next: FeedItem[]) => {
    const seen = new Set(prev.map((item) => item.photoId));
    const out = [...prev];
    for (const item of next) {
      if (!seen.has(item.photoId)) {
        seen.add(item.photoId);
        out.push(item);
      }
    }
    return out;
  }, []);

  const loadFeed = useCallback(
    async (reset = false) => {
      if (!userId) return;
      setFeedLoading(true);
      setFeedError(null);
      try {
        const res = await getNostalgiaFeed({
          mode: "nostalgia",
          limit: 12,
          seed,
          cursor: reset ? undefined : (feedCursorRef.current ?? undefined),
        });
        const items = (res.items ?? []) as FeedItem[];
        setFeedItems((prev) => (reset ? items : mergeUnique(prev, items)));
        const nextCursor = res.nextCursor ?? null;
        feedCursorRef.current = nextCursor;
        setFeedCursor(nextCursor);
      } catch {
        setFeedError("We could not load the home feed.");
      } finally {
        setFeedLoading(false);
      }
    },
    [getNostalgiaFeed, mergeUnique, seed, userId],
  );

  useEffect(() => {
    if (userLoading || aiLoading || !userId) return;
    setFeedItems([]);
    setFeedCursor(null);
    setFeedError(null);
    void loadFeed(true);
  }, [aiLoading, loadFeed, userId, userLoading]);

  const showIndexingBanner = aiReady;

  if (userLoading || aiLoading) {
    return (
      <div className="min-h-screen px-4 py-6 md:px-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="mt-3 h-8 w-48 rounded bg-muted animate-pulse" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <FeedCardSkeleton />
            <FeedCardSkeleton />
            <FeedCardSkeleton />
            <FeedCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">
            Sign in to continue
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Your home view is private and tied to your account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-[14px] font-semibold text-primary-foreground transition-all hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-primary">
                Home
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                One intelligent feed for your library
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                Fresh uploads get priority, then the ranking folds in favorites,
                faces, anniversaries, location context, and the moments you tend
                to revisit.
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
              {aiOptIn === true ? "Tune AI" : "Enable AI"}
            </Link>
          </div>
        </div>

        {aiOptIn !== true && (
          <div className="mb-8 rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[14px] font-medium text-foreground">
              Home is active without AI.
            </p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Turn on AI analysis to improve captions, tags, and ranking
              quality, but your uploaded photos will still show up here either
              way.
            </p>
          </div>
        )}

        {showIndexingBanner && (
          <div className="mb-8 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              <Sparkles className="h-5 w-5 shrink-0 animate-pulse text-primary" />
              <div className="min-w-0 flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${aiProgress.percent}%` }}
                  />
                </div>
                <p className="mt-2 text-[13px] text-muted-foreground font-medium">
                  Indexing {aiProgress.processed} of {aiProgress.total} photos
                  <span className="opacity-70">
                    {" "}
                    · {aiProgress.pending} remaining
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {feedError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center mb-8">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-[15px] font-medium text-foreground mb-4">
              {feedError}
            </p>
            <button
              type="button"
              onClick={() => void loadFeed(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-background border border-border px-4 py-2 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        {!feedError && feedItems.length === 0 && feedLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <FeedCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!feedError && feedItems.length === 0 && !feedLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-border bg-muted/20">
            <ImageOff className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-[18px] font-semibold text-foreground">
              No photos yet
            </p>
            <p className="mt-2 text-[15px] text-muted-foreground max-w-md">
              {HOME_EMPTY_HINT}
            </p>
          </div>
        )}

        {feedItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {feedItems.map((item) => (
              <FeedCardWrapper
                key={item.photoId}
                photoId={item.photoId}
                item={item}
                onFavorite={(id) =>
                  toggleFavorite({ photoId: id as Id<"photos"> })
                }
              />
            ))}
          </div>
        )}

        {feedItems.length > 0 && feedCursor && (
          <div className="flex justify-center py-12">
            <button
              type="button"
              onClick={() => void loadFeed()}
              className="rounded-full bg-secondary px-8 py-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              disabled={feedLoading}
            >
              {feedLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Load more"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedCardWrapper({
  photoId,
  item,
  onFavorite,
}: {
  photoId: string;
  item: FeedItem;
  onFavorite: (id: string) => void;
}) {
  const photo = useQuery(api.photos.getById, {
    photoId: photoId as Id<"photos">,
  }) as PhotoRecord | null | undefined;

  if (photo === undefined) {
    return <FeedCardSkeleton />;
  }

  if (!photo) return null;

  return <FeedCard item={item} photo={photo} onFavorite={onFavorite} />;
}
