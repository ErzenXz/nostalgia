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
      className="group flex gap-3 rounded-xl p-2.5 transition-colors duration-150 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-white/[0.06]"
    >
      {/* Thumbnail */}
      <div className="relative w-[120px] sm:w-[130px] shrink-0 aspect-video rounded-lg overflow-hidden bg-[#272727]">
        {url ? (
          isVideo ? (
            <video
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="130px"
              unoptimized
            />
          )
        ) : (
          <div className="absolute inset-0 bg-[#272727] animate-pulse" />
        )}
        {isVideo && (
          <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white/70">
            Video
          </div>
        )}
        {photo.isFavorite && (
          <div className="absolute top-1.5 right-1.5">
            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5 space-y-1">
        <h4 className="text-[13px] text-[#f1f1f1] font-medium line-clamp-2 leading-snug">
          {photo.description || photo.fileName}
        </h4>
        <p className="text-[11px] text-[#aaa]">
          {formatDate(photo.takenAt ?? photo.uploadedAt)}
        </p>
        {photo.locationName && (
          <p className="text-[11px] text-[#aaa] flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{photo.locationName}</span>
          </p>
        )}
        {photo.aiTags && photo.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {photo.aiTags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[#aaa] border border-white/[0.06]">
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
        <Loader2 className="h-6 w-6 animate-spin text-[#aaa]" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Images className="h-10 w-10 text-[#717171] mb-4" />
        <p className="text-[#f1f1f1] font-medium mb-1">Photo not found</p>
        <button
          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-[#272727] text-[#f1f1f1] text-sm hover:bg-[#3f3f3f] transition-colors"
          onClick={() => router.push("/photos")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Photos
        </button>
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
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 lg:px-6 border-b border-white/[0.06] bg-[#0f0f0f]/97 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#aaa] hover:text-white hover:bg-white/[0.05] transition-colors"
            onClick={() => router.push("/photos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[13px] text-[#aaa] truncate max-w-[200px] sm:max-w-[320px]">
            {photo.fileName}
          </h1>
        </div>

        <div className="flex items-center gap-0.5">
          {[
            { icon: Heart, action: () => toggleFavorite({ photoId: photoId as any }), active: photo.isFavorite, activeClass: "text-red-500" },
            { icon: Archive, action: () => archivePhoto({ photoId: photoId as any }) },
            { icon: Share2, action: () => {} },
            { icon: Download, action: () => {} },
          ].map(({ icon: Icon, action, active, activeClass }, i) => (
            <button
              key={i}
              onClick={action}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                active ? (activeClass ?? "text-white") : "text-[#aaa]",
                "hover:text-white hover:bg-white/[0.05]",
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", active && activeClass && "fill-current")} />
            </button>
          ))}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#aaa] hover:text-red-400 hover:bg-red-950/20 transition-colors"
            onClick={() => { trashPhoto({ photoId: photoId as any }); router.push("/photos"); }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-sm hover:bg-black/80 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}
              {nextPhoto && (
                <Link
                  href={`/photos/${nextPhoto._id}`}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-sm hover:bg-black/80 hover:text-white transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}

              {/* Frame counter */}
              {currentIndex >= 0 && (
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[11px] text-white/60 tabular-nums">
                  {currentIndex + 1} / {allPhotos.length}
                </div>
              )}
            </div>

            {/* Bottom sprocket strip */}
            <SprocketStrip count={14} />
          </div>

          {/* ── Title + quick stats ── */}
          <div className="mt-5 space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#f1f1f1] leading-tight">
              {photo.description || photo.fileName}
            </h2>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {photo.locationName && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#aaa]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {photo.locationName}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[12px] text-[#aaa]">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {formatDate(photo.takenAt ?? photo.uploadedAt)}
              </div>
              {(photo.cameraMake || photo.cameraModel) && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#aaa]">
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[12px] text-[#aaa]">
                <FileImage className="h-3.5 w-3.5 shrink-0" />
                {formatBytes(photo.sizeBytes)}
              </div>
            </div>

            {/* Tags */}
            {photo.aiTags && photo.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {photo.aiTags.slice(0, 14).map((tag: string) => (
                  <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-white/[0.06] text-[#aaa] border border-white/[0.06] hover:bg-white/[0.1] hover:text-[#f1f1f1] transition-colors cursor-pointer">
                    {tag}
                  </span>
                ))}
                {photo.aiTags.length > 14 && (
                  <span className="text-[11px] text-[#717171] self-center">+{photo.aiTags.length - 14}</span>
                )}
              </div>
            )}
          </div>

          {/* ── AI Description ── */}
          {photo.description && (
            <div className="mt-5 rounded-xl bg-[#1f1f1f] border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <Sparkles className="h-4 w-4 text-[#c9a66b] shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-[#f1f1f1]">AI Description</p>
                  <p className="text-[10px] text-[#717171]">Generated by AI analysis</p>
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-[13px] text-[#f1f1f1] leading-relaxed">
                  {photo.description}
                </p>
              </div>
            </div>
          )}

          {/* ── Technical Data — EXIF ── */}
          <div className="mt-4 rounded-xl bg-[#1f1f1f] border border-white/[0.06] overflow-hidden">
            <details className="group" open>
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-[#aaa]" />
                  <span className="text-[12px] font-medium text-[#f1f1f1]">Technical Details</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[#717171] transition-transform duration-200 group-open:rotate-90" />
              </summary>

              <div className="border-t border-white/[0.06] px-4 py-4 space-y-4">
                {/* EXIF grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {exifData.map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-[#272727] border border-white/[0.04] px-3 py-2.5">
                      <span className="text-[10px] uppercase tracking-wider text-[#717171] block mb-1">{label}</span>
                      <span className="text-[12px] text-[#f1f1f1] block truncate">{value || "—"}</span>
                    </div>
                  ))}
                </div>

                {/* Color palette */}
                {photo.dominantColors && photo.dominantColors.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#717171] block mb-2.5">Color Palette</span>
                    <div className="flex gap-2 flex-wrap">
                      {photo.dominantColors.slice(0, 6).map((color: string, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div
                            className="h-8 w-8 rounded-lg border border-white/[0.06]"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-[9px] text-[#717171] uppercase">{color.replace("#", "")}</span>
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

        {/* ── RIGHT: Up Next ── */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0">
          <h3 className="text-[13px] font-semibold text-[#f1f1f1] mb-3">Up Next</h3>

          <div className="space-y-2">
            {relatedPhotos.slice(0, 12).map((rPhoto: any) => (
              <RelatedPhotoCard key={rPhoto._id} photo={rPhoto} />
            ))}
            {relatedPhotos.length === 0 && (
              <div className="text-center py-12">
                <Images className="h-8 w-8 text-[#717171] mx-auto mb-3" />
                <p className="text-[13px] text-[#aaa]">No related photos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
