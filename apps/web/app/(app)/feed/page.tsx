"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAiOptInForUserId } from "@/hooks/use-ai-opt-in";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Sparkles,
  Calendar,
  Shuffle,
  Telescope,
  Loader2,
  Heart,
  Settings,
  AlertTriangle,
  RefreshCw,
  ImageOff,
  MapPin,
  ChevronRight,
  Play,
} from "lucide-react";
import Link from "next/link";

type FeedMode = "nostalgia" | "on_this_day" | "deep_dive_year" | "serendipity";

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

const modeConfig: Record<
  FeedMode,
  { label: string; icon: typeof Sparkles; description: string; emptyHint: string }
> = {
  nostalgia: {
    label: "For You",
    icon: Sparkles,
    description: "Curated by AI from your most meaningful moments",
    emptyHint: "Upload photos spanning different time periods to unlock nostalgia scoring",
  },
  on_this_day: {
    label: "On This Day",
    icon: Calendar,
    description: "See what you were doing on this day in past years",
    emptyHint: "Photos with dates from previous years will appear here",
  },
  deep_dive_year: {
    label: "Year Dive",
    icon: Telescope,
    description: "Explore a specific year in detail",
    emptyHint: "Select a year that has photos to explore",
  },
  serendipity: {
    label: "Rediscover",
    icon: Shuffle,
    description: "Forgotten moments you haven't seen in a while",
    emptyHint: "The more photos you upload, the better the surprises",
  },
};

// ── Card Image ──────────────────────────────────────────────

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
  const isVideo = mimeType.startsWith("video/");

  if (!displayUrl) {
    return (
      <div className="absolute inset-0 bg-[#1f1f1f] animate-pulse" />
    );
  }

  return (
    <>
      <Image
        src={displayUrl}
        alt={alt}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        unoptimized
      />
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
    </>
  );
}

// ── Feed Card ───────────────────────────────────────────────

function FeedCard({
  item,
  photo,
  onFavorite,
}: {
  item: FeedItem;
  photo: any;
  onFavorite: (id: string) => void;
}) {
  const [liked, setLiked] = useState(photo?.isFavorite ?? false);
  if (!photo) return null;

  const date = item.takenAt ?? item.uploadedAt;

  return (
    <Link href={`/photos/${item.photoId}`} className="block group">
      <div className="space-y-2">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#1f1f1f]">
          <CardImage
            storageKey={photo.storageKey}
            thumbnailStorageKey={photo.thumbnailStorageKey}
            mimeType={photo.mimeType}
            isEncrypted={photo.isEncrypted}
            alt={item.captionShort || photo.fileName}
          />

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />

          {/* Time-ago badge */}
          {date && (
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm rounded px-1.5 py-0.5">
              <span className="text-[10px] text-white/80 tabular-nums">
                {timeAgo(date)}
              </span>
            </div>
          )}

          {/* Amber dot for AI-scored items */}
          {item.score > 0.7 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5">
              <Sparkles className="h-2.5 w-2.5 text-[#c9a66b]" />
            </div>
          )}
        </div>

        {/* Metadata below thumbnail */}
        <div className="px-0.5 space-y-1">
          {/* Caption / title */}
          <p className="text-[13px] text-[#f1f1f1] font-medium leading-snug line-clamp-2">
            {item.captionShort || photo.fileName}
          </p>
          {/* Date + location meta */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#aaa]">
            {date && <span>{formatDate(date)}</span>}
            {photo.locationName && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {photo.locationName}
                </span>
              </>
            )}
          </div>
          {/* Tags */}
          {item.aiTagsV2 && item.aiTagsV2.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {item.aiTagsV2.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[#aaa] border border-white/[0.06]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Like action (bottom-right, discreet) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked(!liked);
            onFavorite(item.photoId);
          }}
          className="opacity-0 group-hover:opacity-100 absolute bottom-14 right-2 transition-opacity duration-200 p-1.5 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              liked ? "fill-red-500 text-red-500" : "text-white",
            )}
          />
        </button>
      </div>
    </Link>
  );
}

// ── Hydrated card ────────────────────────────────────────────

function FeedCardHydrated({
  item,
  onFavorite,
  index,
}: {
  item: FeedItem;
  onFavorite: (id: string) => void;
  index: number;
}) {
  const photo = useQuery(api.photos.getById, { photoId: item.photoId as any });

  if (photo === undefined) {
    return (
      <div className="space-y-2">
        <div className="aspect-video w-full rounded-xl bg-[#1f1f1f] animate-pulse" />
        <div className="space-y-1.5 px-0.5">
          <div className="h-3 w-3/4 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-2.5 w-1/2 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    );
  }
  if (!photo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.2), ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <FeedCard item={item} photo={photo} onFavorite={onFavorite} />
    </motion.div>
  );
}

// ── Section row ──────────────────────────────────────────────

function SectionRow({
  title,
  icon: Icon,
  description,
  items,
  onFavorite,
  isLoading,
}: {
  title: string;
  icon: React.ElementType;
  description: string;
  items: FeedItem[];
  onFavorite: (id: string) => void;
  isLoading: boolean;
}) {
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-[#c9a66b]" />
          <div>
            <h2 className="text-[15px] font-semibold text-[#f1f1f1]">{title}</h2>
            <p className="text-[11px] text-[#aaa] mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-video rounded-xl bg-[#1f1f1f] animate-pulse" />
              <div className="space-y-1.5 px-0.5">
                <div className="h-3 w-3/4 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <FeedCardHydrated
              key={item.photoId}
              item={item}
              onFavorite={onFavorite}
              index={i}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Time ago ─────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const years = Math.floor((Date.now() - ts) / (365.25 * 24 * 60 * 60 * 1000));
  if (years === 0) return "This year";
  if (years === 1) return "1 yr ago";
  return `${years} yrs ago`;
}

// ── Main page ─────────────────────────────────────────────────

export default function FeedPage() {
  const [mode, setMode] = useState<FeedMode>("nostalgia");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [seed] = useState(() => crypto.randomUUID());
  const [deepDiveYear, setDeepDiveYear] = useState(() => new Date().getFullYear() - 1);

  const { userId, isLoading: userLoading } = useCurrentUser();
  const { aiOptIn, isLoading: aiOptInLoading } = useAiOptInForUserId(userId as any);
  const aiProgress = useQuery(
    api.users.getAiProgress,
    userId && aiOptIn === true ? { userId } : "skip",
  );

  const observerRef = useRef<HTMLDivElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const itemsRef = useRef<FeedItem[]>([]);
  const feedTokenRef = useRef(0);

  const getNostalgiaFeed = useAction(api.feed.nostalgia.getNostalgiaFeed);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);

  useEffect(() => { itemsRef.current = items; }, [items]);

  const mergeUnique = useCallback((prev: FeedItem[], next: FeedItem[]) => {
    const seen = new Set(prev.map((i) => i.photoId));
    const out = [...prev];
    for (const item of next) {
      if (!seen.has(item.photoId)) { seen.add(item.photoId); out.push(item); }
    }
    return out;
  }, []);

  const loadMore = useCallback(async (reset = false) => {
    const token = feedTokenRef.current;
    if (userLoading || aiOptInLoading || !userId || aiOptIn !== true) return;
    if (!reset && nextCursorRef.current === null) return;
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    if (token === feedTokenRef.current) { setIsLoading(true); setHasError(false); }
    try {
      const res = await getNostalgiaFeed({
        mode,
        limit: 16,
        seed,
        cursor: reset ? undefined : (nextCursorRef.current ?? undefined),
        year: mode === "deep_dive_year" ? deepDiveYear : undefined,
      });
      const newItems: FeedItem[] = res.items ?? [];
      const prev = reset ? [] : itemsRef.current;
      const merged = reset ? newItems : mergeUnique(prev, newItems);
      if (token === feedTokenRef.current) {
        itemsRef.current = merged;
        setItems(merged);
        nextCursorRef.current = merged.length > prev.length && newItems.length > 0 ? (res.nextCursor ?? null) : null;
      }
    } catch {
      if (token === feedTokenRef.current) setHasError(true);
    } finally {
      isLoadingRef.current = false;
      if (token === feedTokenRef.current) setIsLoading(false);
    }
  }, [aiOptIn, aiOptInLoading, deepDiveYear, getNostalgiaFeed, mergeUnique, mode, seed, userId, userLoading]);

  useEffect(() => {
    if (userLoading || aiOptInLoading || !userId) return;
    feedTokenRef.current += 1;
    isLoadingRef.current = false;
    setIsLoading(false);
    itemsRef.current = [];
    setItems([]);
    nextCursorRef.current = null;
    setHasError(false);
    if (aiOptIn === true) void loadMore(true);
  }, [mode, deepDiveYear, aiOptIn, aiOptInLoading, loadMore, userId, userLoading]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || !nextCursorRef.current || isLoadingRef.current || hasError) return;
        void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasError, loadMore]);

  // ── Loading/auth gates ────────────────────────────────────

  if (userLoading || aiOptInLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-[#aaa]" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-8 text-center">
        <h2 className="text-xl font-semibold text-[#f1f1f1] mb-2">Sign in to view your feed</h2>
        <p className="text-sm text-[#aaa] mb-6">Your feed is personalized to your account.</p>
        <Link href="/login" className="px-4 py-2 rounded-full bg-primary text-black text-sm font-medium hover:brightness-110 transition-all">
          Sign In
        </Link>
      </div>
    );
  }

  if (aiOptIn !== true) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1f1f1f] border border-white/[0.08] mb-4">
          <Sparkles className="h-7 w-7 text-[#c9a66b]" />
        </div>
        <h2 className="text-xl font-semibold text-[#f1f1f1] mb-2">Enable AI Intelligence</h2>
        <p className="text-sm text-[#aaa] max-w-sm mb-6">
          The Nostalgia Feed uses AI to surface your most meaningful memories.
          Enable AI Intelligence in Settings to get started.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black text-sm font-medium hover:brightness-110 transition-all"
        >
          <Settings className="h-4 w-4" />
          Open Settings
        </Link>
      </div>
    );
  }

  const currentMode = modeConfig[mode];
  const showIndexingBanner = aiProgress && aiProgress.total > 0 && !aiProgress.isComplete && aiProgress.pending > 0;

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-8">

      {/* ── AI indexing progress banner ── */}
      {showIndexingBanner && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[#1f1f1f] border border-white/[0.06]">
          <Sparkles className="h-4 w-4 text-[#c9a66b] shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-1">
              <div
                className="h-full rounded-full bg-[#c9a66b] transition-all duration-500"
                style={{ width: `${aiProgress.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-[#aaa]">
              Indexing {aiProgress.processed} of {aiProgress.total} photos · {aiProgress.pending} remaining
            </p>
          </div>
        </div>
      )}

      {/* ── Mode tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(modeConfig) as FeedMode[]).map((m) => {
          const config = modeConfig[m];
          const Icon = config.icon;
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-all duration-200",
                isActive
                  ? "bg-white text-black"
                  : "bg-[#272727] text-[#f1f1f1] hover:bg-[#3f3f3f]",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* ── Year selector (Deep Dive) ── */}
      {mode === "deep_dive_year" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] text-[#aaa] uppercase tracking-wider shrink-0">Year:</span>
          {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 1 - i).map((y) => (
            <button
              key={y}
              onClick={() => setDeepDiveYear(y)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-150 shrink-0",
                y === deepDiveYear
                  ? "bg-white text-black"
                  : "bg-[#272727] text-[#aaa] hover:bg-[#3f3f3f] hover:text-[#f1f1f1]",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {hasError && items.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-8 w-8 text-[#aaa] mb-3" />
          <p className="text-[#f1f1f1] font-medium mb-1">Failed to load feed</p>
          <p className="text-[13px] text-[#aaa] mb-5">Something went wrong</p>
          <button
            onClick={() => loadMore(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#272727] text-[#f1f1f1] text-sm hover:bg-[#3f3f3f] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {items.length === 0 && !isLoading && !hasError && (
        <div className="flex flex-col items-center justify-center py-20">
          <ImageOff className="h-10 w-10 text-[#717171] mb-4" />
          <p className="text-[#f1f1f1] font-medium mb-2">No memories found</p>
          <p className="text-[13px] text-[#aaa] text-center max-w-sm">{currentMode.emptyHint}</p>
        </div>
      )}

      {/* ── Feed grid section ── */}
      {(items.length > 0 || isLoading) && (
        <SectionRow
          title={currentMode.label}
          icon={currentMode.icon}
          description={currentMode.description}
          items={items}
          onFavorite={(id) => toggleFavorite({ photoId: id as any })}
          isLoading={isLoading && items.length === 0}
        />
      )}

      {/* ── Load more sentinel ── */}
      <div ref={observerRef} className="flex justify-center py-4">
        {isLoading && items.length > 0 && (
          <div className="flex items-center gap-2 text-[#aaa] text-[13px]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
}
