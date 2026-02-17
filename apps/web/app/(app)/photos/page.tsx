"use client";

import { useState, useCallback, useMemo, useRef, Suspense, memo } from "react";
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
import { TimelineScrubber } from "@/components/photos/timeline-scrubber";
import { Lightbox } from "@/components/photos/lightbox";
import { UploadDialog } from "@/components/upload/upload-dialog";
import { Button } from "@/components/ui/button";
import { groupPhotosByDate } from "@/lib/utils";
import {
  Upload,
  Grid3X3,
  Images,
  Loader2,
  LayoutGrid,
  Heart,
  MapPin,
  ChevronRight,
} from "lucide-react";

export default function PhotosPage() {
  return (
    <Suspense>
      <PhotosContent />
    </Suspense>
  );
}

/** Horizontal scrollable thumbnail for feed sections */
const FeedThumbnail = memo(function FeedThumbnail({ photo }: { photo: any }) {
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
      className="group relative shrink-0 w-[200px] md:w-[220px] overflow-hidden rounded-xl bg-card/50 border border-border/30 transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-black/10"
    >
      <div className="relative aspect-video">
        {url ? (
          isVideo ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
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
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="220px"
              unoptimized
            />
          )
        ) : (
          <div className="absolute inset-0 bg-secondary/40 animate-pulse" />
        )}

        {isVideo && (
          <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] text-white">
            Video
          </div>
        )}

        {photo.isFavorite && (
          <div className="absolute top-1.5 right-1.5">
            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
          </div>
        )}
      </div>

      <div className="p-2.5">
        <h3 className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
          {photo.description || photo.fileName}
        </h3>
        {photo.locationName && (
          <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            <span className="truncate">{photo.locationName}</span>
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
          {new Date(photo.takenAt || photo._creationTime).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
});

/** A horizontal scroll section */
const FeedSection = memo(function FeedSection({
  title,
  photos,
  linkHref,
  linkLabel,
}: {
  title: string;
  photos: any[];
  linkHref?: string;
  linkLabel?: string;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between px-4 md:px-8 mb-3">
        <h2 className="text-sm font-heading font-semibold text-foreground">{title}</h2>
        {linkHref && (
          <Link
            href={linkHref}
            className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
          >
            {linkLabel ?? "See all"}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2 scrollbar-none">
        {photos.slice(0, 12).map((photo: any) => (
          <FeedThumbnail key={photo._id} photo={photo} />
        ))}
      </div>
    </div>
  );
});

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
  const dateRefsMap = useRef(new Map<string, HTMLDivElement>());

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

  const photos = useMemo(() => photosResult?.photos ?? [], [photosResult]);
  const isLoading = userLoading || (userId && photosResult === undefined);

  // Timeline entries for scrubber
  const timelineEntries = useMemo(() => {
    if (photos.length === 0) return [];
    const grouped = groupPhotosByDate(photos);
    return Array.from(grouped.entries()).map(([dateKey, datePhotos]) => ({
      label: dateKey,
      dateKey,
      count: datePhotos.length,
    }));
  }, [photos]);

  // Active date key from scroll position
  const [activeDateKey, setActiveDateKey] = useState<string | undefined>();

  const handleTimelineSelect = useCallback((dateKey: string) => {
    const el = dateRefsMap.current.get(dateKey);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveDateKey(dateKey);
    }
  }, []);

  const feedSections = useMemo(() => {
    if (!photos || photos.length === 0) return null;

    const now = Date.now();
    const dayMs = 86400000;

    const recent = photos.filter((p: any) => {
      const t = p.takenAt ?? p.uploadedAt;
      return now - t < dayMs * 7;
    });

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
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
          <Images className="h-12 w-12 opacity-30" />
          <p className="mt-4 text-sm font-light tracking-wide">
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
        <div className="space-y-2 py-4">
          {feedSections && (
            <>
              <FeedSection title="Recent" photos={feedSections.recent} />
              <FeedSection
                title="On This Day"
                photos={feedSections.onThisDay}
                linkHref="/memories"
                linkLabel="Memories"
              />
              <FeedSection
                title="Favorites"
                photos={feedSections.favorites}
                linkHref="/favorites"
              />
              {feedSections.topLocations.map(([location, locPhotos]) => (
                <FeedSection
                  key={location}
                  title={location}
                  photos={locPhotos}
                  linkHref="/map"
                  linkLabel="Map"
                />
              ))}
              <FeedSection title="Older Photos" photos={feedSections.older} />
            </>
          )}

          <div className="px-4 md:px-8 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-semibold text-foreground">
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

          {/* Timeline scrubber */}
          <TimelineScrubber
            entries={timelineEntries}
            activeDateKey={activeDateKey}
            onSelect={handleTimelineSelect}
          />

          <PhotoGrid
            photos={photos}
            onPhotoClick={(photo) => router.push(`/photos/${photo._id}`)}
            onFavorite={handleFavorite}
            emptyMessage="Upload your first photos to get started"
            emptyIcon={<Images className="h-12 w-12 opacity-50" />}
            stickyHeaders
            dateRefs={dateRefsMap}
          />
        </div>
      ) : (
        <>
          {selectable && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-4 md:px-8 py-2">
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

          {/* Timeline scrubber for grid view too */}
          <TimelineScrubber
            entries={timelineEntries}
            activeDateKey={activeDateKey}
            onSelect={handleTimelineSelect}
          />

          <PhotoGrid
            photos={photos}
            onPhotoClick={handlePhotoClick}
            onFavorite={handleFavorite}
            selectable={selectable}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyMessage="Upload your first photos to get started"
            emptyIcon={<Images className="h-12 w-12 opacity-50" />}
            stickyHeaders
            dateRefs={dateRefsMap}
          />

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

      <UploadDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </>
  );
}
