"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePhotoUrl, usePhotoUrls } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { cn, formatDate, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Heart,
  Archive,
  Share2,
  Download,
  Trash2,
  MapPin,
  Calendar,
  Camera,
  Tag,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Images,
} from "lucide-react";

function DetailImage({
  storageKey,
  alt,
  mimeType,
  isEncrypted,
}: {
  storageKey: string;
  alt: string;
  mimeType: string;
  isEncrypted?: boolean;
}) {
  const signedUrl = usePhotoUrl(storageKey);
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: storageKey,
    signedUrl,
    mimeType,
    enabled: !!isEncrypted,
  });

  const url = isEncrypted ? decryptedUrl : signedUrl;
  const isVideo = mimeType.startsWith("video/");

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center bg-secondary">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Camera className="h-12 w-12 animate-pulse" />
          <p className="text-sm">Loading photo...</p>
        </div>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-contain"
        src={url}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      className="object-contain"
      sizes="100vw"
      unoptimized
      priority
    />
  );
}

function RelatedPhotoCard({ photo }: { photo: any }) {
  const imageKey = photo.thumbnailStorageKey || photo.storageKey;
  const signedUrl = usePhotoUrl(imageKey);
  const isThumb =
    !!photo.thumbnailStorageKey && imageKey === photo.thumbnailStorageKey;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: isThumb ? "image/jpeg" : photo.mimeType,
    enabled: !!photo.isEncrypted,
  });
  const url = photo.isEncrypted ? decryptedUrl : signedUrl;
  const isVideo =
    typeof photo.mimeType === "string" && photo.mimeType.startsWith("video/");

  return (
    <Link
      href={`/photos/${photo._id}`}
      className="group flex gap-3 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-muted-foreground/25 transition-all p-2"
    >
      {/* Thumbnail */}
      <div className="relative w-[140px] sm:w-[160px] shrink-0 aspect-video rounded-lg overflow-hidden bg-secondary">
        {url ? (
          isVideo ? (
            <video
              className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
              src={url}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <Image
              src={url}
              alt={photo.description || photo.fileName}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="160px"
              unoptimized
            />
          )
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted animate-pulse" />
        )}
        {photo.isFavorite && (
          <div className="absolute top-1.5 right-1.5">
            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-1">
        <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {photo.description || photo.fileName}
        </h4>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
          {formatDate(photo.takenAt ?? photo.uploadedAt)}
        </p>
        {photo.locationName && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {photo.locationName}
          </p>
        )}
        {photo.aiTags && photo.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {photo.aiTags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function RelatedPhotoThumbnail({ photo }: { photo: any }) {
  const imageKey = photo.thumbnailStorageKey || photo.storageKey;
  const signedUrl = usePhotoUrl(imageKey);
  const isThumb =
    !!photo.thumbnailStorageKey && imageKey === photo.thumbnailStorageKey;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: isThumb ? "image/jpeg" : photo.mimeType,
    enabled: !!photo.isEncrypted,
  });
  const url = photo.isEncrypted ? decryptedUrl : signedUrl;
  const isVideo =
    typeof photo.mimeType === "string" && photo.mimeType.startsWith("video/");

  return (
    <Link
      href={`/photos/${photo._id}`}
      className="group relative aspect-square overflow-hidden rounded-lg bg-secondary hover:ring-2 hover:ring-primary/50 transition-all"
    >
      {url ? (
        isVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
            src={url}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src={url}
            alt={photo.description || photo.fileName}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            unoptimized
          />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted animate-pulse" />
      )}
      {photo.isFavorite && (
        <div className="absolute top-1.5 right-1.5">
          <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
        </div>
      )}
    </Link>
  );
}

export default function PhotoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const photoId = params.id as string;

  const { userId, isLoading: userLoading } = useCurrentUser();

  const photo = useQuery(api.photos.getById, { photoId: photoId as any });

  // Get user's photo list to find related/adjacent photos
  const photosResult = useQuery(
    api.photos.listByUser,
    userId ? { userId, limit: 200 } : "skip",
  );

  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const archivePhoto = useMutation(api.photos.archive);
  const trashPhoto = useMutation(api.photos.trash);

  const allPhotos = photosResult?.photos ?? [];

  // Find current photo index in the list for prev/next navigation
  const currentIndex = useMemo(
    () => allPhotos.findIndex((p: any) => p._id === photoId),
    [allPhotos, photoId],
  );

  // Get related photos — photos with similar tags or taken around the same time
  const relatedPhotos = useMemo(() => {
    if (!photo || allPhotos.length === 0) return [];

    const currentTags = new Set(photo.aiTags ?? []);
    const currentTime = photo.takenAt ?? photo.uploadedAt;

    // Score each photo for relevance
    const scored = allPhotos
      .filter((p: any) => p._id !== photoId)
      .map((p: any) => {
        let score = 0;
        // Tag overlap
        const pTags = p.aiTags ?? [];
        for (const tag of pTags) {
          if (currentTags.has(tag)) score += 3;
        }
        // Same location
        if (
          photo.locationName &&
          p.locationName &&
          photo.locationName === p.locationName
        )
          score += 5;
        // Time proximity (within 24h = 2pts, within 7d = 1pt)
        const timeDiff = Math.abs((p.takenAt ?? p.uploadedAt) - currentTime);
        if (timeDiff < 86400000) score += 2;
        else if (timeDiff < 86400000 * 7) score += 1;
        // Same camera
        if (
          photo.cameraModel &&
          p.cameraModel &&
          photo.cameraModel === p.cameraModel
        )
          score += 1;
        return { photo: p, score };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 12);

    // If we don't have enough scored results, fill with recent photos
    if (scored.length < 6) {
      const existing = new Set(scored.map((s: any) => s.photo._id));
      const recent = allPhotos
        .filter((p: any) => p._id !== photoId && !existing.has(p._id))
        .slice(0, 12 - scored.length);
      return [...scored.map((s: any) => s.photo), ...recent];
    }

    return scored.map((s: any) => s.photo);
  }, [photo, allPhotos, photoId]);

  const prevPhoto = currentIndex > 0 ? allPhotos[currentIndex - 1] : null;
  const nextPhoto =
    currentIndex < allPhotos.length - 1 ? allPhotos[currentIndex + 1] : null;

  const isLoading =
    userLoading ||
    photo === undefined ||
    (userId && photosResult === undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Images className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">Photo not found</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/photos")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Photos
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/photos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
              {photo.fileName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleFavorite({ photoId: photoId as any })}
          >
            <Heart
              className={cn(
                "h-5 w-5",
                photo.isFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground",
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => archivePhoto({ photoId: photoId as any })}
          >
            <Archive className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Share2 className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Download className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              trashPhoto({ photoId: photoId as any });
              router.push("/photos");
            }}
          >
            <Trash2 className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Main content area - YouTube style */}
      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1800px] mx-auto">
        {/* Left: Photo and info */}
        <div className="flex-1 min-w-0">
          {/* Photo container */}
          <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9]">
              <DetailImage
                storageKey={photo.storageKey}
                alt={photo.description || photo.fileName}
                mimeType={photo.mimeType}
                isEncrypted={photo.isEncrypted}
              />
            </div>

            {/* Previous / Next navigation arrows */}
            {prevPhoto && (
              <Link
                href={`/photos/${prevPhoto._id}`}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70 hover:text-white transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="h-6 w-6" />
              </Link>
            )}
            {nextPhoto && (
              <Link
                href={`/photos/${nextPhoto._id}`}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70 hover:text-white transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="h-6 w-6" />
              </Link>
            )}

            {/* Photo counter */}
            {currentIndex >= 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/70 backdrop-blur-sm">
                {currentIndex + 1} / {allPhotos.length}
              </div>
            )}
          </div>

          {/* Photo title and meta - YouTube video title style */}
          <div className="mt-4 space-y-3">
            <h2 className="text-lg sm:text-xl font-medium text-foreground leading-tight">
              {photo.description || photo.fileName}
            </h2>
            
            {/* Quick stats row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {photo.locationName && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {photo.locationName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(photo.takenAt ?? photo.uploadedAt)}
              </span>
              {(photo.cameraMake || photo.cameraModel) && (
                <span className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
                </span>
              )}
            </div>

            {/* Tags row */}
            {photo.aiTags && photo.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {photo.aiTags.slice(0, 10).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-2.5 py-1 rounded-full">
                    {tag}
                  </Badge>
                ))}
                {photo.aiTags.length > 10 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{photo.aiTags.length - 10} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* AI Description - YouTube description style */}
          {photo.description && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">AI Description</span>
                  <p className="text-xs text-muted-foreground">Auto-generated caption</p>
                </div>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {photo.description}
              </p>
            </div>
          )}

          {/* Details section - collapsible style */}
          <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
            <details className="group">
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Photo Details</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="border-t border-border p-4 space-y-4">
                {/* Metadata grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Date Taken</span>
                    <p className="text-foreground">{formatDate(photo.takenAt ?? photo.uploadedAt)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Uploaded</span>
                    <p className="text-foreground">{formatDate(photo.uploadedAt)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">File Size</span>
                    <p className="text-foreground">{formatBytes(photo.sizeBytes)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Type</span>
                    <p className="text-foreground">{photo.mimeType}</p>
                  </div>
                  {(photo.cameraMake || photo.cameraModel) && (
                    <>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Camera</span>
                        <p className="text-foreground">{[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}</p>
                      </div>
                      {(photo.focalLength || photo.aperture || photo.iso) && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Settings</span>
                          <p className="text-foreground">
                            {[photo.focalLength, photo.aperture && `f/${photo.aperture}`, photo.iso && `ISO ${photo.iso}`].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {photo.dominantColors && photo.dominantColors.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-2">Colors</span>
                      <div className="flex gap-1.5">
                        {photo.dominantColors.slice(0, 5).map((color: string, i: number) => (
                          <div
                            key={i}
                            className="h-6 w-6 rounded-full border border-border shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Right sidebar: Related Photos - YouTube suggestions style */}
        <div className="w-full lg:w-[400px] xl:w-[440px] shrink-0">
          <h3 className="text-sm font-medium text-foreground mb-3 px-1">Related Photos</h3>
          <div className="space-y-3">
            {relatedPhotos.slice(0, 12).map((rPhoto: any) => (
              <RelatedPhotoCard key={rPhoto._id} photo={rPhoto} />
            ))}
            {relatedPhotos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Images className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No related photos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
