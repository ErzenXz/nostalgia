"use client";

import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { cn } from "@/lib/utils";
import {
  Heart,
  ImageOff,
  Play,
  MonitorPlay,
  Film,
} from "lucide-react";

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

const FILTER_TABS = [
  { id: "all", label: "All Videos" },
  { id: "recent", label: "Recently Added" },
  { id: "favorites", label: "Favorites" },
];

function formatDuration(mimeType?: string) {
  if (mimeType?.startsWith("video/")) {
    return "0:00"; // Placeholder for video duration since it's not in the data model yet
  }
  return null;
}

function VideoCardImage({
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

function VideoCard({
  video,
  onFavorite,
}: {
  video: PhotoRecord;
  onFavorite: (id: string) => void;
}) {
  const [liked, setLiked] = useState(video?.isFavorite ?? false);
  if (!video) return null;

  const duration = formatDuration(video.mimeType);

  return (
    <Link href={`/photos/${video._id}`} className="group block relative overflow-hidden rounded-xl bg-muted aspect-[3/4] w-full">
      <VideoCardImage
        storageKey={video.storageKey}
        thumbnailStorageKey={video.thumbnailStorageKey}
        mimeType={video.mimeType}
        isEncrypted={video.isEncrypted}
        alt={video.description || video.fileName}
      />
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
      
      {/* Top Right Duration */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span className="text-[12px] font-medium text-white drop-shadow-md">
          {duration}
        </span>
      </div>

      {/* Center Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20">
          <Play className="h-8 w-8 text-white fill-white ml-1" />
        </div>
      </div>

      {/* Progress Bar (Decorative) */}
      <div className="absolute top-4 left-4 right-16 h-1 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full bg-white w-0 group-hover:w-1/3 rounded-full transition-all duration-1000 ease-out" />
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-[16px] font-semibold text-white leading-tight mb-3 line-clamp-2 drop-shadow-sm">
          {video.description || video.locationName || video.fileName}
        </h3>
        
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden shrink-0">
            {video.locationName ? video.locationName.charAt(0) : "U"}
          </div>
          <span className="text-[13px] font-medium text-white/90 drop-shadow-sm truncate">
            {video.locationName || "You"}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked(!liked);
              onFavorite(video._id);
            }}
            className="text-white hover:scale-110 transition-transform p-1"
          >
            <Heart className={cn("h-5 w-5", liked ? "fill-white text-white" : "text-white")} />
          </button>
        </div>
      </div>
    </Link>
  );
}

function VideoCardSkeleton() {
  return (
    <div className="relative aspect-[3/4] w-full rounded-xl bg-muted animate-pulse overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
        <div className="h-5 w-3/4 bg-white/20 rounded" />
        <div className="flex items-center gap-2 pt-2">
          <div className="h-6 w-6 rounded-full bg-white/20" />
          <div className="h-4 w-20 bg-white/20 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function VideosPage() {
  const { userId, isLoading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("all");
  
  const toggleFavorite = useMutation(api.photos.toggleFavorite);

  // Use the new listVideos query to get only video files
  const videosResult = useQuery(
    api.photos.listVideos,
    userId ? { userId, limit: 50 } : "skip"
  );
  
  const allVideos = (videosResult?.videos ?? []) as PhotoRecord[];
  
  const filteredVideos = useMemo(() => {
    if (activeTab === "favorites") {
      return allVideos.filter(v => v.isFavorite);
    }
    return allVideos;
  }, [allVideos, activeTab]);

  if (userLoading || videosResult === undefined) {
    return (
      <div className="min-h-screen px-4 py-6 md:px-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <div className="flex gap-6 border-b border-border pb-2">
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <VideoCardSkeleton />
            <VideoCardSkeleton />
            <VideoCardSkeleton />
            <VideoCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">Sign in to view videos</h1>
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
        {/* Navigation Tabs */}
        <div className="flex items-center gap-8 border-b border-border mb-8 overflow-x-auto scrollbar-none pb-[-1px]">
          {FILTER_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap py-4 text-[15px] font-semibold transition-colors relative",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                {tab.label}
                {active && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-foreground" />
                )}
              </button>
            );
          })}
        </div>

        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-border bg-muted/20">
            <MonitorPlay className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-[18px] font-semibold text-foreground">
              No videos found
            </p>
            <p className="mt-2 text-[15px] text-muted-foreground max-w-md">
              {activeTab === "favorites" 
                ? "You haven't liked any videos yet."
                : "Upload some videos to see them here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video._id}
                video={video}
                onFavorite={(id) => toggleFavorite({ photoId: id as Id<"photos"> })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
