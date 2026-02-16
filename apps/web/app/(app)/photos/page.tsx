"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { UploadDialog } from "@/components/upload/upload-dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Grid3X3,
  Images,
  Loader2,
  LayoutGrid,
  Heart,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function PhotosPage() {
  return (
    <Suspense>
      <PhotosContent />
    </Suspense>
  );
}

/** Horizontal scrollable thumbnail for feed sections */
function FeedThumbnail({ photo }: { photo: any }) {
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
      className="group relative flex-shrink-0 aspect-square w-40 sm:w-44 md:w-48 overflow-hidden rounded-xl bg-secondary hover:ring-2 hover:ring-primary/50 transition-all"
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
            sizes="200px"
            unoptimized
          />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted animate-pulse" />
      )}
      {photo.isFavorite && (
        <div className="absolute top-2 right-2">
          <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 drop-shadow-sm" />
        </div>
      )}
      {photo.locationName && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-white truncate block">
            {photo.locationName}
          </span>
        </div>
      )}
    </Link>
  );
}

/** A horizontal scroll section in the feed */
function FeedSection({
  title,
  icon,
  photos,
  linkHref,
  linkLabel,
  gradient,
}: {
  title: string;
  icon: React.ReactNode;
  photos: any[];
  linkHref?: string;
  linkLabel?: string;
  gradient?: string;
}) {
  if (photos.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between px-8 mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <span className="text-xs text-muted-foreground">{photos.length}</span>
        </div>
        {linkHref && (
          <Link
            href={linkHref}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {linkLabel ?? "See all"}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto px-8 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        {photos.slice(0, 20).map((photo: any) => (
          <FeedThumbnail key={photo._id} photo={photo} />
        ))}
      </div>
    </div>
  );
}

function PhotosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(
    searchParams.get("upload") === "true",
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectable, setSelectable] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "grid">("feed");

  const { userId, isLoading: userLoading } = useCurrentUser();

  const photosResult = useQuery(
    api.photos.listByUser,
    userId ? { userId, limit: 200 } : "skip",
  );

  const favorites = useQuery(
    api.photos.listFavorites,
    userId ? { userId } : "skip",
  );

  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const archivePhoto = useMutation(api.photos.archive);
  const trashPhoto = useMutation(api.photos.trash);

  const photos = photosResult?.photos ?? [];
  const isLoading = userLoading || (userId && photosResult === undefined);

  // Compute feed sections
  const feedSections = useMemo(() => {
    if (photos.length === 0) return null;

    const now = Date.now();
    const dayMs = 86400000;

    // Recent: last 7 days
    const recent = photos.filter((p: any) => {
      const t = p.takenAt ?? p.uploadedAt;
      return now - t < dayMs * 7;
    });

    // This Day in History: same month+day from previous years
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const thisYear = today.getFullYear();
    const onThisDay = photos.filter((p: any) => {
      const d = new Date(p.takenAt ?? p.uploadedAt);
      return (
        d.getMonth() === todayMonth &&
        d.getDate() === todayDay &&
        d.getFullYear() !== thisYear
      );
    });

    // By Location: group by locationName, pick top locations
    const locationMap = new Map<string, any[]>();
    for (const p of photos) {
      if (p.locationName) {
        const existing = locationMap.get(p.locationName) ?? [];
        existing.push(p);
        locationMap.set(p.locationName, existing);
      }
    }
    const topLocations = Array.from(locationMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);

    // Older photos: older than 30 days
    const older = photos.filter((p: any) => {
      const t = p.takenAt ?? p.uploadedAt;
      return now - t > dayMs * 30;
    });

    return {
      recent,
      onThisDay,
      favorites: favorites ?? [],
      topLocations,
      older,
    };
  }, [photos, favorites]);

  const handlePhotoClick = useCallback(
    (_photo: any, index: number) => {
      if (viewMode === "grid") {
        setLightboxIndex(index);
      } else {
        router.push(`/photos/${_photo._id}`);
      }
    },
    [viewMode, router],
  );

  const handleFavorite = useCallback(
    (photoId: string) => {
      toggleFavorite({ photoId: photoId as any });
    },
    [toggleFavorite],
  );

  const handleArchive = useCallback(
    (photoId: string) => {
      archivePhoto({ photoId: photoId as any });
    },
    [archivePhoto],
  );

  const handleTrash = useCallback(
    (photoId: string) => {
      trashPhoto({ photoId: photoId as any });
      setLightboxIndex(null);
    },
    [trashPhoto],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Photos" description={`${photos.length} photos`}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setViewMode(viewMode === "feed" ? "grid" : "feed")}
          title={viewMode === "feed" ? "Grid view" : "Feed view"}
        >
          {viewMode === "feed" ? (
            <Grid3X3 className="h-4 w-4" />
          ) : (
            <LayoutGrid className="h-4 w-4" />
          )}
        </Button>
        {viewMode === "grid" && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelectable((v) => !v)}
            className={selectable ? "bg-accent" : ""}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </PageHeader>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Images className="h-12 w-12 opacity-50" />
          <p className="mt-4 text-sm">
            Upload your first photos to get started
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4" />
            Upload Photos
          </Button>
        </div>
      ) : viewMode === "feed" ? (
        /* ──── Feed View ──── */
        <div className="space-y-8 py-6">
          {feedSections && (
            <>
              <FeedSection
                title="Recent"
                icon={<Clock className="h-4 w-4 text-blue-400" />}
                photos={feedSections.recent}
              />

              <FeedSection
                title="On This Day"
                icon={<Sparkles className="h-4 w-4 text-amber-400" />}
                photos={feedSections.onThisDay}
                linkHref="/memories"
                linkLabel="Memories"
              />

              <FeedSection
                title="Favorites"
                icon={<Heart className="h-4 w-4 text-red-400" />}
                photos={feedSections.favorites}
                linkHref="/favorites"
              />

              {feedSections.topLocations.map(([location, locPhotos]) => (
                <FeedSection
                  key={location}
                  title={location}
                  icon={<MapPin className="h-4 w-4 text-green-400" />}
                  photos={locPhotos}
                  linkHref="/map"
                  linkLabel="Map"
                />
              ))}

              <FeedSection
                title="Older Photos"
                icon={<Images className="h-4 w-4 text-muted-foreground" />}
                photos={feedSections.older}
              />
            </>
          )}

          {/* All photos grid below the feed sections */}
          <div className="px-8 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                All Photos
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                View as grid
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <PhotoGrid
            photos={photos}
            onPhotoClick={(photo) => router.push(`/photos/${photo._id}`)}
            onFavorite={handleFavorite}
            emptyMessage="Upload your first photos to get started"
            emptyIcon={<Images className="h-12 w-12 opacity-50" />}
          />
        </div>
      ) : (
        /* ──── Grid View ──── */
        <>
          {/* Selection toolbar */}
          {selectable && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 border-b border-border bg-secondary/50 px-8 py-2">
              <span className="text-sm text-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  selectedIds.forEach((id) =>
                    archivePhoto({ photoId: id as any }),
                  );
                  setSelectedIds(new Set());
                }}
              >
                Archive
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  selectedIds.forEach((id) =>
                    trashPhoto({ photoId: id as any }),
                  );
                  setSelectedIds(new Set());
                }}
              >
                Delete
              </Button>
            </div>
          )}

          <PhotoGrid
            photos={photos}
            onPhotoClick={handlePhotoClick}
            onFavorite={handleFavorite}
            selectable={selectable}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyMessage="Upload your first photos to get started"
            emptyIcon={<Images className="h-12 w-12 opacity-50" />}
          />

          {/* Lightbox */}
          {lightboxIndex !== null && (
            <Lightbox
              photos={photos}
              currentIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onNavigate={setLightboxIndex}
              onFavorite={handleFavorite}
              onArchive={handleArchive}
              onTrash={handleTrash}
            />
          )}
        </>
      )}

      {/* Upload Dialog */}
      <UploadDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </>
  );
}
