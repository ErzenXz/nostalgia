"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { cn, formatDate, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Images,
  FileImage,
} from "lucide-react";

// ─── Detail Image ──────────────────────────────────────────

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
      <div className="flex h-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3 text-amber-800/40">
          <Camera className="h-10 w-10 animate-pulse" />
          <p className="text-xs font-mono uppercase tracking-wider">Developing…</p>
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
      className="object-contain projector-flicker"
      sizes="100vw"
      unoptimized
      priority
    />
  );
}

// ─── Related Photo Card ────────────────────────────────────

function RelatedPhotoCard({ photo }: { photo: any }) {
  const imageKey = photo.thumbnailStorageKey || photo.storageKey;
  const signedUrl = usePhotoUrl(imageKey);
  const isThumb = !!photo.thumbnailStorageKey && imageKey === photo.thumbnailStorageKey;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: isThumb ? "image/jpeg" : photo.mimeType,
    enabled: !!photo.isEncrypted,
  });
  const url = photo.isEncrypted ? decryptedUrl : signedUrl;
  const isVideo = typeof photo.mimeType === "string" && photo.mimeType.startsWith("video/");

  return (
    <Link
      href={`/photos/${photo._id}`}
      className={cn(
        "group flex gap-3 rounded-xl p-2.5 transition-all duration-300",
        "bg-[#0f0e0d] border border-amber-900/12",
        "hover:border-amber-800/28 hover:bg-[#121110]",
        "hover:shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_16px_-8px_rgba(201,166,107,0.1)]",
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-[120px] sm:w-[130px] shrink-0 aspect-video rounded-lg overflow-hidden bg-[#0c0b0a]">
        {url ? (
          isVideo ? (
            <video
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 photo-warm"
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
              className="object-cover transition-transform duration-500 group-hover:scale-105 photo-warm"
              sizes="130px"
              unoptimized
            />
          )
        ) : (
          <div className="absolute inset-0 bg-amber-950/20 animate-pulse" />
        )}
        {isVideo && (
          <div className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-amber-500/70 uppercase tracking-wider">
            Video
          </div>
        )}
        {photo.isFavorite && (
          <div className="absolute top-1.5 right-1.5">
            <Heart className="h-3 w-3 fill-red-500/80 text-red-500/80" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h4 className="text-sm font-serif text-foreground/85 line-clamp-2 leading-tight mb-1.5">
          {photo.description || photo.fileName}
        </h4>
        <p className="text-[10px] font-mono text-amber-800/50">
          {formatDate(photo.takenAt ?? photo.uploadedAt)}
        </p>
        {photo.locationName && (
          <p className="text-[10px] font-mono text-amber-800/40 mt-0.5 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{photo.locationName}</span>
          </p>
        )}
        {photo.aiTags && photo.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {photo.aiTags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono bg-amber-950/40 text-amber-800/50 border border-amber-900/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Sprocket Strip ────────────────────────────────────────

function SprocketStrip({ count = 12 }: { count?: number }) {
  return (
    <div className="flex items-center justify-around px-3 h-[18px] bg-black pointer-events-none select-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-3 h-2.5 rounded-[2px] bg-[#141311] border border-amber-900/18"
        />
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function PhotoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const photoId = params.id as string;

  const { userId, isLoading: userLoading } = useCurrentUser();

  const photo = useQuery(api.photos.getById, { photoId: photoId as any });

  const photosResult = useQuery(
    api.photos.listByUser,
    userId ? { userId, limit: 200 } : "skip",
  );

  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const archivePhoto = useMutation(api.photos.archive);
  const trashPhoto = useMutation(api.photos.trash);

  const allPhotos = photosResult?.photos ?? [];

  const currentIndex = useMemo(
    () => allPhotos.findIndex((p: any) => p._id === photoId),
    [allPhotos, photoId],
  );

  const relatedPhotos = useMemo(() => {
    if (!photo || allPhotos.length === 0) return [];

    const currentTags = new Set(photo.aiTags ?? []);
    const currentTime = photo.takenAt ?? photo.uploadedAt;

    const scored = allPhotos
      .filter((p: any) => p._id !== photoId)
      .map((p: any) => {
        let score = 0;
        const pTags = p.aiTags ?? [];
        for (const tag of pTags) {
          if (currentTags.has(tag)) score += 3;
        }
        if (photo.locationName && p.locationName && photo.locationName === p.locationName)
          score += 5;
        const timeDiff = Math.abs((p.takenAt ?? p.uploadedAt) - currentTime);
        if (timeDiff < 86400000) score += 2;
        else if (timeDiff < 86400000 * 7) score += 1;
        if (photo.cameraModel && p.cameraModel && photo.cameraModel === p.cameraModel)
          score += 1;
        return { photo: p, score };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 12);

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
  const nextPhoto = currentIndex < allPhotos.length - 1 ? allPhotos[currentIndex + 1] : null;

  const isLoading =
    userLoading ||
    photo === undefined ||
    (userId && photosResult === undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-amber-700/50" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-950/25 border border-amber-900/20 mb-4">
          <Images className="h-6 w-6 text-amber-800/40" />
        </div>
        <p className="text-sm font-serif text-foreground/80 mb-1">Photo not found</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 text-amber-800/60 hover:text-amber-400"
          onClick={() => router.push("/photos")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Photos
        </Button>
      </div>
    );
  }

  // Build EXIF metadata rows
  const exifData = [
    { label: "DATE TAKEN", value: formatDate(photo.takenAt ?? photo.uploadedAt) },
    { label: "UPLOADED", value: formatDate(photo.uploadedAt) },
    { label: "FILE SIZE", value: formatBytes(photo.sizeBytes) },
    { label: "TYPE", value: photo.mimeType?.split("/").pop()?.toUpperCase() ?? "—" },
    ...(photo.cameraMake || photo.cameraModel
      ? [{ label: "CAMERA", value: [photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ") }]
      : []),
    ...(photo.focalLength ? [{ label: "FOCAL LENGTH", value: photo.focalLength }] : []),
    ...(photo.aperture ? [{ label: "APERTURE", value: `f/${photo.aperture}` }] : []),
    ...(photo.iso ? [{ label: "ISO", value: String(photo.iso) }] : []),
    ...(photo.detectedFaces != null
      ? [{ label: "FACES", value: String(photo.detectedFaces) }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      {/* ── Top navigation bar ── */}
      <div
        className={cn(
          "sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 lg:px-6",
          "border-b border-amber-900/20",
          "bg-[#0d0d0d]/97 backdrop-blur-md",
          "shadow-[0_1px_0_rgba(201,166,107,0.04)]",
        )}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-amber-800/60 hover:text-amber-400 hover:bg-amber-950/40"
            onClick={() => router.push("/photos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-mono text-amber-700/60 truncate max-w-[200px] sm:max-w-[320px] tracking-wider">
            {photo.fileName}
          </h1>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-amber-800/60 hover:text-amber-400 hover:bg-amber-950/40"
            onClick={() => toggleFavorite({ photoId: photoId as any })}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-all duration-300",
                photo.isFavorite ? "fill-red-500/80 text-red-500/80 scale-110" : "",
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-amber-800/60 hover:text-amber-400 hover:bg-amber-950/40"
            onClick={() => archivePhoto({ photoId: photoId as any })}
          >
            <Archive className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-amber-800/60 hover:text-amber-400 hover:bg-amber-950/40"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-amber-800/60 hover:text-amber-400 hover:bg-amber-950/40"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-amber-800/60 hover:text-red-400/70 hover:bg-red-950/25"
            onClick={() => {
              trashPhoto({ photoId: photoId as any });
              router.push("/photos");
            }}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Main content — YouTube / cinema layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1800px] mx-auto">
        {/* ── LEFT: Photo viewer + metadata ── */}
        <div className="flex-1 min-w-0">

          {/* Film frame viewer */}
          <div
            className={cn(
              "relative rounded-xl overflow-hidden bg-black film-frame",
            )}
          >
            {/* Top sprocket strip */}
            <SprocketStrip count={14} />

            {/* Photo */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9]">
              <DetailImage
                storageKey={photo.storageKey}
                alt={photo.description || photo.fileName}
                mimeType={photo.mimeType}
                isEncrypted={photo.isEncrypted}
              />

              {/* Prev / Next navigation */}
              {prevPhoto && (
                <Link
                  href={`/photos/${prevPhoto._id}`}
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2",
                    "flex h-10 w-10 items-center justify-center",
                    "rounded-full bg-black/60 text-white/70 backdrop-blur-sm",
                    "border border-amber-900/20",
                    "hover:bg-black/80 hover:text-amber-400 hover:border-amber-700/30",
                    "transition-all duration-200",
                  )}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}
              {nextPhoto && (
                <Link
                  href={`/photos/${nextPhoto._id}`}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "flex h-10 w-10 items-center justify-center",
                    "rounded-full bg-black/60 text-white/70 backdrop-blur-sm",
                    "border border-amber-900/20",
                    "hover:bg-black/80 hover:text-amber-400 hover:border-amber-700/30",
                    "transition-all duration-200",
                  )}
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}

              {/* Frame counter */}
              {currentIndex >= 0 && (
                <div
                  className={cn(
                    "absolute bottom-3 right-3",
                    "px-2.5 py-1 rounded-sm",
                    "bg-black/70 backdrop-blur-sm",
                    "border border-amber-900/20",
                    "text-[10px] font-mono text-amber-600/60 tabular-nums tracking-widest",
                  )}
                >
                  {String(currentIndex + 1).padStart(2, "0")} / {String(allPhotos.length).padStart(2, "0")}
                </div>
              )}
            </div>

            {/* Bottom sprocket strip */}
            <SprocketStrip count={14} />
          </div>

          {/* ── Title + quick stats ── */}
          <div className="mt-5 space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground/95 leading-tight tracking-tight">
              {photo.description || photo.fileName}
            </h2>

            {/* Film slate stats row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {photo.locationName && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-amber-700/60">
                  <MapPin className="h-3.5 w-3.5 text-amber-700/40 shrink-0" />
                  {photo.locationName}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs font-mono text-amber-700/60">
                <Calendar className="h-3.5 w-3.5 text-amber-700/40 shrink-0" />
                {formatDate(photo.takenAt ?? photo.uploadedAt)}
              </div>
              {(photo.cameraMake || photo.cameraModel) && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-amber-700/60">
                  <Camera className="h-3.5 w-3.5 text-amber-700/40 shrink-0" />
                  {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs font-mono text-amber-700/60">
                <FileImage className="h-3.5 w-3.5 text-amber-700/40 shrink-0" />
                {formatBytes(photo.sizeBytes)}
              </div>
            </div>

            {/* Tags */}
            {photo.aiTags && photo.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {photo.aiTags.slice(0, 14).map((tag: string) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-1 rounded-sm font-mono bg-amber-950/40 text-amber-700/65 border border-amber-900/22 tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
                {photo.aiTags.length > 14 && (
                  <span className="text-[10px] font-mono text-amber-900/40 self-center">
                    +{photo.aiTags.length - 14}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Develop Notes — AI Description ── */}
          {photo.description && (
            <div className="mt-5 rounded-xl overflow-hidden darkroom-panel">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-900/12">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                    "bg-amber-950/60 border border-amber-800/25",
                  )}
                >
                  <Sparkles className="h-4 w-4 text-amber-500/75" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-600/65">
                    Develop Notes
                  </p>
                  <p className="text-[9px] font-mono text-amber-900/40 tracking-wider">
                    AI GENERATED CAPTION
                  </p>
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm font-serif text-foreground/85 leading-relaxed italic">
                  &ldquo;{photo.description}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* ── Technical Data — EXIF ── */}
          <div className="mt-4 rounded-xl overflow-hidden darkroom-panel">
            <details className="group" open>
              <summary
                className={cn(
                  "flex items-center justify-between px-4 py-3 cursor-pointer",
                  "hover:bg-amber-950/15 transition-colors duration-200",
                )}
              >
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-amber-800/50" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-700/65">
                    Technical Data
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-800/35 transition-transform duration-200 group-open:rotate-90" />
              </summary>

              <div className="border-t border-amber-900/12 px-4 py-4 space-y-4">
                {/* EXIF data grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {exifData.map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg bg-[#0c0b0a] border border-amber-900/10 px-3 py-2.5"
                    >
                      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-amber-900/45 block mb-1">
                        {label}
                      </span>
                      <span className="text-xs font-mono text-amber-600/75 block truncate">
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dominant color palette */}
                {photo.dominantColors && photo.dominantColors.length > 0 && (
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-amber-900/45 block mb-2.5">
                      Colour Palette
                    </span>
                    <div className="flex gap-2.5 flex-wrap">
                      {photo.dominantColors.slice(0, 6).map((color: string, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div
                            className="h-8 w-8 rounded-lg border border-amber-900/18 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-[8px] font-mono text-amber-900/35 uppercase">
                            {color.replace("#", "")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>

          {/* Spacer for mobile bottom nav */}
          <div className="h-6" />
        </div>

        {/* ── RIGHT: More from this roll ── */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-4 px-0.5">
            <div className="h-px flex-1 bg-gradient-to-r from-amber-900/25 to-transparent" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-700/55 whitespace-nowrap">
              More From This Roll
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-amber-900/25 to-transparent" />
          </div>

          <div className="space-y-2.5">
            {relatedPhotos.slice(0, 12).map((rPhoto: any) => (
              <RelatedPhotoCard key={rPhoto._id} photo={rPhoto} />
            ))}
            {relatedPhotos.length === 0 && (
              <div className="text-center py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-950/25 border border-amber-900/18 mx-auto mb-3">
                  <Images className="h-5 w-5 text-amber-800/35" />
                </div>
                <p className="text-xs font-mono text-amber-900/35 uppercase tracking-wider">
                  No related photos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
