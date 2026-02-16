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
    <div className="min-h-screen">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/photos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-sm font-medium text-foreground truncate max-w-[300px]">
              {photo.fileName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {formatDate(photo.takenAt ?? photo.uploadedAt)}
            </p>
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

      {/* Main photo display */}
      <div className="relative bg-black">
        <div className="relative h-[60vh] md:h-[70vh]">
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
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        )}
        {nextPhoto && (
          <Link
            href={`/photos/${nextPhoto._id}`}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
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

      {/* Info section below the photo */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Photo metadata grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* AI Description */}
          {photo.description && (
            <div className="col-span-full rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AI Description
                </span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {photo.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {photo.aiTags && photo.aiTags.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tags
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {photo.aiTags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-green-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </span>
            </div>
            <p className="text-sm text-foreground/80">
              {formatDate(photo.takenAt ?? photo.uploadedAt)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Uploaded {formatDate(photo.uploadedAt)}
            </p>
          </div>

          {/* Location */}
          {photo.locationName && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </span>
              </div>
              <p className="text-sm text-foreground/80">{photo.locationName}</p>
              {photo.latitude !== undefined &&
                photo.longitude !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                  </p>
                )}
            </div>
          )}

          {/* Camera */}
          {(photo.cameraMake || photo.cameraModel) && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Camera
                </span>
              </div>
              <p className="text-sm text-foreground/80">
                {[photo.cameraMake, photo.cameraModel]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {photo.focalLength && <span>{photo.focalLength}</span>}
                {photo.aperture && <span>f/{photo.aperture}</span>}
                {photo.iso && <span>ISO {photo.iso}</span>}
                {photo.exposureTime && <span>{photo.exposureTime}s</span>}
              </div>
            </div>
          )}

          {/* File Details */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                File Details
              </span>
            </div>
            <div className="space-y-1 text-sm text-foreground/80">
              {photo.width && photo.height && (
                <p>
                  {photo.width} x {photo.height}
                </p>
              )}
              <p>{formatBytes(photo.sizeBytes)}</p>
              <p className="text-xs text-muted-foreground">{photo.mimeType}</p>
            </div>
          </div>

          {/* Colors */}
          {photo.dominantColors && photo.dominantColors.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Dominant Colors
              </span>
              <div className="mt-3 flex gap-2">
                {photo.dominantColors.map((color: string, i: number) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border border-white/10 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related Photos */}
        {relatedPhotos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Related Photos
              </h2>
              <Link
                href="/photos"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {relatedPhotos.map((rPhoto: any) => (
                <RelatedPhotoThumbnail key={rPhoto._id} photo={rPhoto} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
