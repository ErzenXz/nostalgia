"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from "react";
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
      <div className="flex h-full items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Camera className="h-10 w-10 animate-pulse" />
          <p className="text-xs font-medium uppercase tracking-wider">
            Developing…
          </p>
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

// ─── Related Photo Card ────────────────────────────────────

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
      className="group flex gap-3 rounded-xl p-2.5 transition-colors duration-150 bg-background hover:bg-muted border border-border"
    >
      {/* Thumbnail */}
      <div className="relative w-[120px] sm:w-[130px] shrink-0 aspect-video rounded-lg overflow-hidden bg-muted">
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
              alt={photo.titleShort || photo.description || photo.fileName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="130px"
              unoptimized
            />
          )
        ) : (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {isVideo && (
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
            Video
          </div>
        )}
        {photo.isFavorite && (
          <div className="absolute top-1.5 right-1.5">
            <Heart className="h-3.5 w-3.5 fill-destructive text-destructive" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5 space-y-1">
        <h4 className="text-[13px] text-foreground font-medium line-clamp-2 leading-snug">
          {photo.titleShort ||
            photo.captionShort ||
            photo.description ||
            photo.fileName}
        </h4>
        <p className="text-[11px] text-muted-foreground">
          {formatDate(photo.takenAt ?? photo.uploadedAt)}
        </p>
        {photo.locationName && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{photo.locationName}</span>
          </p>
        )}
        {(photo.aiTagsV2 && photo.aiTagsV2.length > 0) ||
        (photo.aiTags && photo.aiTags.length > 0) ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {(photo.aiTagsV2 ?? photo.aiTags ?? [])
              .slice(0, 2)
              .map((tag: string) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function PhotoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const photoId = params.id as string;

  const { userId, isLoading: userLoading } = useCurrentUser();

  const photo = useQuery(api.photos.getById, { photoId: photoId as any });
  const photoPeopleRows = useQuery(
    api.people.getNamesByPhotoIds,
    photo ? { photoIds: [photo._id] } : "skip",
  );

  const photosResult = useQuery(
    api.photos.listByUser,
    userId ? { userId, limit: 200 } : "skip",
  );

  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const archivePhoto = useMutation(api.photos.archive);
  const trashPhoto = useMutation(api.photos.trash);

  const allPhotos = useMemo(() => photosResult?.photos ?? [], [photosResult]);

  const currentIndex = useMemo(
    () => allPhotos.findIndex((p: any) => p._id === photoId),
    [allPhotos, photoId],
  );

  const relatedPhotos = useMemo(() => {
    if (!photo || allPhotos.length === 0) return [];

    const currentTags = new Set(photo.aiTagsV2 ?? photo.aiTags ?? []);
    const currentTime = photo.takenAt ?? photo.uploadedAt;

    const scored = allPhotos
      .filter((p: any) => p._id !== photoId)
      .map((p: any) => {
        let score = 0;
        const pTags = p.aiTagsV2 ?? p.aiTags ?? [];
        for (const tag of pTags) {
          if (currentTags.has(tag)) score += 3;
        }
        if (
          photo.locationName &&
          p.locationName &&
          photo.locationName === p.locationName
        )
          score += 5;
        const timeDiff = Math.abs((p.takenAt ?? p.uploadedAt) - currentTime);
        if (timeDiff < 86400000) score += 2;
        else if (timeDiff < 86400000 * 7) score += 1;
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
  const recognizedPeople =
    (photoPeopleRows?.[0]?.names as string[] | undefined) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Images className="h-10 w-10 mb-4 opacity-50" />
        <p className="font-medium mb-1 text-foreground">Photo not found</p>
        <button
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-muted transition-colors border border-border"
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
    {
      label: "DATE TAKEN",
      value: formatDate(photo.takenAt ?? photo.uploadedAt),
    },
    { label: "UPLOADED", value: formatDate(photo.uploadedAt) },
    { label: "FILE SIZE", value: formatBytes(photo.sizeBytes) },
    {
      label: "TYPE",
      value: photo.mimeType?.split("/").pop()?.toUpperCase() ?? "—",
    },
    ...(photo.cameraMake || photo.cameraModel
      ? [
          {
            label: "CAMERA",
            value: [photo.cameraMake, photo.cameraModel]
              .filter(Boolean)
              .join(" "),
          },
        ]
      : []),
    ...(photo.focalLength
      ? [{ label: "FOCAL LENGTH", value: photo.focalLength }]
      : []),
    ...(photo.aperture
      ? [{ label: "APERTURE", value: `f/${photo.aperture}` }]
      : []),
    ...(photo.iso ? [{ label: "ISO", value: String(photo.iso) }] : []),
    ...(photo.sceneType ? [{ label: "SCENE", value: photo.sceneType }] : []),
    ...(photo.mood ? [{ label: "MOOD", value: photo.mood }] : []),
    ...(photo.indoorOutdoor
      ? [{ label: "SETTING", value: photo.indoorOutdoor.toUpperCase() }]
      : []),
    ...(photo.detectedFaces != null
      ? [{ label: "FACES", value: String(photo.detectedFaces) }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top navigation bar ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 md:px-8 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors"
            onClick={() => router.push("/photos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[14px] font-medium text-foreground truncate max-w-[200px] sm:max-w-[320px]">
            {photo.titleShort || photo.fileName}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {[
            {
              icon: Heart,
              action: () => toggleFavorite({ photoId: photoId as any }),
              active: photo.isFavorite,
              activeClass: "text-destructive fill-destructive",
            },
            {
              icon: Archive,
              action: () => archivePhoto({ photoId: photoId as any }),
            },
            { icon: Share2, action: () => {} },
            { icon: Download, action: () => {} },
          ].map(({ icon: Icon, action, active, activeClass }, i) => (
            <button
              key={i}
              onClick={action}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                active
                  ? (activeClass ?? "text-foreground")
                  : "text-muted-foreground",
                "hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5",
                  active && activeClass && "fill-current",
                )}
              />
            </button>
          ))}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => {
              trashPhoto({ photoId: photoId as any });
              router.push("/photos");
            }}
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* ── Main content — YouTube / cinema layout ── */}
      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-8 max-w-[1600px] mx-auto">
        {/* ── LEFT: Photo viewer + metadata ── */}
        <div className="flex-1 min-w-0">
          {/* Viewer */}
          <div
            className={cn(
              "relative rounded-xl overflow-hidden bg-muted border border-border shadow-sm",
            )}
          >
            {/* Photo */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9]">
              <DetailImage
                storageKey={photo.storageKey}
                alt={photo.titleShort || photo.description || photo.fileName}
                mimeType={photo.mimeType}
                isEncrypted={photo.isEncrypted}
              />

              {/* Prev / Next navigation */}
              {prevPhoto && (
                <Link
                  href={`/photos/${prevPhoto._id}`}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md hover:bg-background transition-colors border border-border shadow-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}
              {nextPhoto && (
                <Link
                  href={`/photos/${nextPhoto._id}`}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md hover:bg-background transition-colors border border-border shadow-sm"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}

              {/* Frame counter */}
              {currentIndex >= 0 && (
                <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md text-[12px] font-medium text-foreground tabular-nums border border-border shadow-sm">
                  {currentIndex + 1} / {allPhotos.length}
                </div>
              )}
            </div>
          </div>

          {/* ── Title + quick stats ── */}
          <div className="mt-6 space-y-4">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground leading-tight">
              {photo.titleShort ||
                photo.captionShort ||
                photo.description ||
                photo.fileName}
            </h2>

            {photo.captionShort && (
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                {photo.captionShort}
              </p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {photo.locationName && (
                <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {photo.locationName}
                </div>
              )}
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                {formatDate(photo.takenAt ?? photo.uploadedAt)}
              </div>
              {(photo.cameraMake || photo.cameraModel) && (
                <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                  <Camera className="h-4 w-4 shrink-0" />
                  {[photo.cameraMake, photo.cameraModel]
                    .filter(Boolean)
                    .join(" ")}
                </div>
              )}
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <FileImage className="h-4 w-4 shrink-0" />
                {formatBytes(photo.sizeBytes)}
              </div>
            </div>

            {photo.hashtags && photo.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {photo.hashtags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-[12px] font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {recognizedPeople.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {recognizedPeople.map((name) => (
                  <span
                    key={name}
                    className="text-[12px] font-medium px-3 py-1 rounded-full bg-secondary text-foreground border border-border"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}

            {/* Tags */}
            {(photo.aiTagsV2 && photo.aiTagsV2.length > 0) ||
            (photo.aiTags && photo.aiTags.length > 0) ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {(photo.aiTagsV2 ?? photo.aiTags ?? [])
                  .slice(0, 14)
                  .map((tag: string) => (
                    <span
                      key={tag}
                      className="text-[12px] font-medium px-3 py-1 rounded-full bg-secondary text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      #{tag.replace(/\s+/g, "")}
                    </span>
                  ))}
                {(photo.aiTagsV2 ?? photo.aiTags ?? []).length > 14 && (
                  <span className="text-[12px] font-medium text-muted-foreground self-center px-2">
                    +{(photo.aiTagsV2 ?? photo.aiTags ?? []).length - 14}
                  </span>
                )}
              </div>
            ) : null}
          </div>

          {/* ── AI Description ── */}
          {photo.description && (
            <div className="mt-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-foreground">
                    AI Description
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Generated by AI analysis
                  </p>
                </div>
              </div>
              <div className="px-5 py-5">
                {photo.peopleSummary && (
                  <p className="text-[13px] font-medium text-foreground/80 mb-3">
                    {photo.peopleSummary}
                  </p>
                )}
                <p className="text-[14px] text-foreground leading-relaxed">
                  {photo.description}
                </p>
                {photo.visibleText && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/20 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                      Visible Text
                    </p>
                    <p className="text-[13px] text-foreground leading-relaxed">
                      {photo.visibleText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Technical Data — EXIF ── */}
          <div className="mt-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <details className="group" open>
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Info className="h-4.5 w-4.5 text-muted-foreground" />
                  <span className="text-[14px] font-semibold text-foreground">
                    Technical Details
                  </span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-muted-foreground transition-transform duration-200 group-open:rotate-90" />
              </summary>

              <div className="border-t border-border px-5 py-5 space-y-6">
                {/* EXIF grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {exifData.map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg bg-muted/30 border border-border px-4 py-3"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
                        {label}
                      </span>
                      <span className="text-[13px] font-medium text-foreground block truncate">
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Color palette */}
                {photo.dominantColors && photo.dominantColors.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-3">
                      Color Palette
                    </span>
                    <div className="flex gap-3 flex-wrap">
                      {photo.dominantColors
                        .slice(0, 6)
                        .map((color: string, i: number) => (
                          <div
                            key={i}
                            className="flex flex-col items-center gap-2"
                          >
                            <div
                              className="h-10 w-10 rounded-full border border-border shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">
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
          <div className="h-10 md:h-6" />
        </div>

        {/* ── RIGHT: Up Next ── */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0">
          <h3 className="text-[15px] font-semibold text-foreground mb-4">
            Up Next
          </h3>

          <div className="space-y-3">
            {relatedPhotos.slice(0, 12).map((rPhoto: any) => (
              <RelatedPhotoCard key={rPhoto._id} photo={rPhoto} />
            ))}
            {relatedPhotos.length === 0 && (
              <div className="text-center py-16 bg-card border border-border border-dashed rounded-xl">
                <Images className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-[14px] font-medium text-foreground">
                  No related photos
                </p>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Upload more photos to see connections.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
