"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  Suspense,
  memo,
  useEffect,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { AddToAlbumSheet } from "@/components/albums/add-to-album-sheet";
import { Button } from "@/components/ui/button";
import { groupPhotosByDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Upload,
  Grid3X3,
  Images,
  LayoutGrid,
  Heart,
  MapPin,
  Video,
  ChevronRight,
  CheckSquare,
  X,
  Archive,
  Trash2,
  PlusCircle,
} from "lucide-react";

export default function PhotosPage() {
  return (
    <Suspense>
      <PhotosContent />
    </Suspense>
  );
}

// ─── Filter chip types ─────────────────────────────────────

type FilterChip = "all" | "favorites" | "videos" | "has-location" | "by-camera";

const FILTER_CHIPS: { id: FilterChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "videos", label: "Videos" },
  { id: "has-location", label: "Has Location" },
  { id: "by-camera", label: "By Camera" },
];

// ─── Thumbnail for horizontal feed sections ────────────────

const FeedThumbnail = memo(function FeedThumbnail({ photo }: { photo: any }) {
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
      className="group relative shrink-0 w-[140px] md:w-[160px] overflow-hidden rounded-xl bg-muted aspect-[3/4] block"
    >
      {url ? (
        isVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 140px, 160px"
            unoptimized
          />
        )
      ) : (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      {isVideo && (
        <div className="absolute top-2 right-2 rounded-md bg-black/40 px-1.5 py-0.5 flex items-center gap-1 backdrop-blur-md">
          <Video className="h-3 w-3 text-white" />
          <span className="text-[10px] font-medium text-white">Video</span>
        </div>
      )}
      {photo.isFavorite && (
        <div className="absolute top-2 right-2">
          <Heart className="h-4 w-4 fill-destructive text-destructive drop-shadow-md" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
        <p className="line-clamp-2 text-[13px] font-medium text-white drop-shadow-sm leading-tight mb-2">
          {photo.description || photo.fileName}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[8px] text-white font-bold overflow-hidden shrink-0">
            {photo.locationName ? photo.locationName.charAt(0) : "U"}
          </div>
          {photo.locationName ? (
            <span className="truncate text-[11px] font-medium text-white/90 drop-shadow-sm">
              {photo.locationName}
            </span>
          ) : (
            <span className="truncate text-[11px] font-medium text-white/90 drop-shadow-sm">
              You
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

// ─── Horizontal scroll section ─────────────────────────────

const FeedSection = memo(function FeedSection({
  title,
  subtitle,
  photos,
  linkHref,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  photos: any[];
  linkHref?: string;
  linkLabel?: string;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="py-2">
      <div className="mb-3 flex items-end justify-between px-4 md:px-8">
        <div>
          <h2 className="text-sm font-semibold text-foreground/90">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-[#9a9a9a]">
              {subtitle}
            </p>
          )}
        </div>
        {linkHref && (
          <Link
            href={linkHref}
            className="flex items-center gap-1 text-[11px] text-[#9a9a9a] transition-colors hover:text-foreground"
          >
            {linkLabel ?? "See all"}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-none md:px-8">
        {photos.slice(0, 14).map((photo: any) => (
          <FeedThumbnail key={photo._id} photo={photo} />
        ))}
      </div>
    </div>
  );
});

// ─── Filter chips row ──────────────────────────────────────

function FilterChips({
  active,
  onChange,
}: {
  active: FilterChip;
  onChange: (v: FilterChip) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-4 py-3 scrollbar-none md:px-8">
      {FILTER_CHIPS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors",
            active === id
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Selection bottom action bar ──────────────────────────

function SelectionBar({
  count,
  onFavorite,
  onArchive,
  onTrash,
  onAddToAlbum,
  onClear,
}: {
  count: number;
  onFavorite: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onAddToAlbum: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-safe lg:left-[--sidebar-width,240px]">
      <div className="mx-auto m-4 max-w-3xl">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur-md">
          <span className="shrink-0 text-[13px] font-medium text-foreground">
            {count} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={onAddToAlbum}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <PlusCircle className="h-4 w-4" />
            Album
          </button>
          <button
            onClick={onFavorite}
            className="rounded-full p-2 text-foreground transition-colors hover:bg-muted"
            title="Favorite"
          >
            <Heart className="h-5 w-5" />
          </button>
          <button
            onClick={onArchive}
            className="rounded-full p-2 text-foreground transition-colors hover:bg-muted"
            title="Archive"
          >
            <Archive className="h-5 w-5" />
          </button>
          <button
            onClick={onTrash}
            className="rounded-full p-2 text-destructive transition-colors hover:bg-destructive/10"
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={onClear}
            className="ml-1 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Clear selection"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ──────────────────────────────────────────

function PhotosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showUpload, setShowUpload] = useState(false);
  const [showAddToAlbum, setShowAddToAlbum] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectable, setSelectable] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "grid">("grid");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const dateRefsMap = useRef(new Map<string, HTMLDivElement>());

  const { userId, isLoading: userLoading } = useCurrentUser();
  const uploadParam = searchParams.get("upload");
  const yearParam = searchParams.get("year");

  const activeYear = useMemo(() => {
    if (!yearParam) return null;
    const parsed = Number(yearParam);
    return Number.isInteger(parsed) ? parsed : null;
  }, [yearParam]);

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

  const allPhotos = useMemo(() => photosResult?.photos ?? [], [photosResult]);
  const favoriteCount = useMemo(
    () => allPhotos.filter((photo: any) => photo.isFavorite).length,
    [allPhotos],
  );
  const videoCount = useMemo(
    () =>
      allPhotos.filter(
        (photo: any) =>
          typeof photo.mimeType === "string" && photo.mimeType.startsWith("video/"),
      ).length,
    [allPhotos],
  );
  const locationCount = useMemo(
    () =>
      allPhotos.filter(
        (photo: any) => photo.latitude != null || photo.locationName,
      ).length,
    [allPhotos],
  );

  useEffect(() => {
    if (uploadParam === "true") {
      setShowUpload(true);
    }
  }, [uploadParam]);

  const scopedPhotos = useMemo(() => {
    if (activeYear == null) return allPhotos;
    return allPhotos.filter((photo: any) => {
      const timestamp = photo.takenAt ?? photo.uploadedAt ?? photo._creationTime;
      return new Date(timestamp).getFullYear() === activeYear;
    });
  }, [activeYear, allPhotos]);

  // Apply active filter
  const photos = useMemo(() => {
    switch (activeFilter) {
      case "favorites":
        return scopedPhotos.filter((p: any) => p.isFavorite);
      case "videos":
        return scopedPhotos.filter(
          (p: any) =>
            typeof p.mimeType === "string" && p.mimeType.startsWith("video/"),
        );
      case "has-location":
        return scopedPhotos.filter(
          (p: any) => p.latitude != null || p.locationName,
        );
      case "by-camera":
        // Group by camera — return photos sorted by cameraMake/Model
        return [...scopedPhotos].sort((a: any, b: any) => {
          const ca = `${a.cameraMake ?? ""} ${a.cameraModel ?? ""}`.trim();
          const cb = `${b.cameraMake ?? ""} ${b.cameraModel ?? ""}`.trim();
          return ca.localeCompare(cb);
        });
      default:
        return scopedPhotos;
    }
  }, [activeFilter, scopedPhotos]);

  const isLoading =
    userLoading || (userId !== undefined && photosResult === undefined);

  // Timeline entries for scrubber
  const timelineEntries = useMemo(() => {
    if (photos.length === 0) return [];
    const grouped = groupPhotosByDate(photos);
    return Array.from(grouped.entries()).map(([dateKey, datePhotos]) => ({
      label: dateKey,
      dateKey,
      count: (datePhotos as any[]).length,
    }));
  }, [photos]);

  const [activeDateKey, setActiveDateKey] = useState<string | undefined>();

  const handleTimelineSelect = useCallback((dateKey: string) => {
    const el = dateRefsMap.current.get(dateKey);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveDateKey(dateKey);
    }
  }, []);

  // Feed sections (only when filter is "all")
  const feedSections = useMemo(() => {
    if (!scopedPhotos || scopedPhotos.length === 0 || activeFilter !== "all")
      return null;

    const now = Date.now();
    const dayMs = 86400000;

    const recent = scopedPhotos.filter((p: any) => {
      const t = p.takenAt ?? p.uploadedAt ?? p._creationTime;
      return now - t < dayMs * 7;
    });

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const thisYear = today.getFullYear();
    const onThisDay = scopedPhotos.filter((p: any) => {
      const d = new Date(p.takenAt ?? p.uploadedAt ?? p._creationTime);
      return (
        d.getMonth() === todayMonth &&
        d.getDate() === todayDay &&
        d.getFullYear() !== thisYear
      );
    });

    const locationMap = new Map<string, any[]>();
    for (const p of scopedPhotos) {
      if (p.locationName) {
        const existing = locationMap.get(p.locationName) ?? [];
        existing.push(p);
        locationMap.set(p.locationName, existing);
      }
    }
    const topLocations = Array.from(locationMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);

    return {
      recent,
      onThisDay,
      favorites: favorites ?? [],
      topLocations,
    };
  }, [activeFilter, favorites, scopedPhotos]);

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
    (photoId: string) => toggleFavorite({ photoId: photoId as any }),
    [toggleFavorite],
  );
  const handleArchive = useCallback(
    (photoId: string) => archivePhoto({ photoId: photoId as any }),
    [archivePhoto],
  );
  const handleTrash = useCallback(
    (photoId: string) => {
      trashPhoto({ photoId: photoId as any });
      setLightboxIndex(null);
    },
    [trashPhoto],
  );

  const handleBulkFavorite = useCallback(() => {
    selectedIds.forEach((id) => toggleFavorite({ photoId: id as any }));
    setSelectedIds(new Set());
  }, [selectedIds, toggleFavorite]);

  const handleBulkArchive = useCallback(() => {
    selectedIds.forEach((id) => archivePhoto({ photoId: id as any }));
    setSelectedIds(new Set());
    setSelectable(false);
  }, [selectedIds, archivePhoto]);

  const handleBulkTrash = useCallback(() => {
    selectedIds.forEach((id) => trashPhoto({ photoId: id as any }));
    setSelectedIds(new Set());
    setSelectable(false);
  }, [selectedIds, trashPhoto]);

  const toggleSelectMode = useCallback(() => {
    setSelectable((v) => !v);
    setSelectedIds(new Set());
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-6 md:px-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <div className="flex gap-6 border-b border-border pb-2">
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            <div className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            <div className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            <div className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const pageDescription = activeYear
    ? `${photos.length} item${photos.length === 1 ? "" : "s"} from ${activeYear}`
    : `${allPhotos.length} item${allPhotos.length === 1 ? "" : "s"} · ${favoriteCount} favorites · ${videoCount} videos`;

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Navigation Tabs and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border mb-8 pb-[-1px]">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none w-full sm:w-auto">
            {FILTER_CHIPS.map((chip) => {
              const active = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={cn(
                    "whitespace-nowrap py-4 text-[15px] font-semibold transition-colors relative",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  {chip.label}
                  {active && (
                    <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          {allPhotos.length > 0 && (
            <div className="flex items-center gap-2 pb-2 sm:pb-0 shrink-0">
              <button
                onClick={toggleSelectMode}
                title={selectable ? "Exit selection" : "Select photos"}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                  selectable
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{selectable ? "Done" : "Select"}</span>
              </button>
              <button
                onClick={() => setViewMode(viewMode === "feed" ? "grid" : "feed")}
                title={viewMode === "feed" ? "Grid view" : "Feed view"}
                className="flex items-center justify-center h-9 w-9 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                {viewMode === "feed" ? (
                  <Grid3X3 className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </button>
              <Button
                size="sm"
                className="h-9 rounded-full px-4 text-[13px]"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </div>
          )}
        </div>

        {allPhotos.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground font-medium mb-6 px-1">
            <span>{locationCount} geotagged</span>
            <span className="text-border">·</span>
            <span>{favoriteCount} favorites</span>
            <span className="text-border">·</span>
            <span>{videoCount} videos</span>
          </div>
        )}

        {activeYear && (
          <div className="mb-6">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[14px] font-medium text-foreground">Viewing {activeYear}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  This deep link filters the library to a single year.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-muted rounded-full"
                onClick={() => router.push("/photos")}
              >
                Clear year filter
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {allPhotos.length === 0 && (
          <div className="py-12">
            <div className="rounded-xl border border-dashed border-border bg-background px-6 py-16 text-center shadow-sm max-w-2xl mx-auto">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Images className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="mt-6 text-[18px] font-semibold text-foreground">
                No photos yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
                Upload your first photos to start building this library.
              </p>
              <div className="mt-8 flex justify-center">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:opacity-90 rounded-full font-semibold px-6"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload photos
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filtered empty state */}
        {allPhotos.length > 0 && photos.length === 0 && (
          <div className="py-12">
            <div className="rounded-xl border border-dashed border-border bg-background px-6 py-16 text-center shadow-sm max-w-2xl mx-auto">
              <Images className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h2 className="mt-6 text-[16px] font-semibold text-foreground">
                No photos match this filter
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Try a different filter or switch back to the full library.
              </p>
              <Button
                variant="outline"
                className="mt-6 border-border text-foreground hover:bg-muted rounded-full"
                onClick={() => setActiveFilter("all")}
              >
                Show all photos
              </Button>
            </div>
          </div>
        )}

        {/* Feed mode */}
        {viewMode === "feed" && photos.length > 0 && (
          <div className="space-y-8 py-4">
            {feedSections ? (
              <>
                <FeedSection
                  title="Recent"
                  subtitle={`Last 7 days · ${feedSections.recent.length} photos`}
                  photos={feedSections.recent}
                />
                {feedSections.onThisDay.length > 0 && (
                  <>
                    <FeedSection
                      title="On This Day"
                      subtitle="From past years"
                      photos={feedSections.onThisDay}
                      linkHref="/memories"
                      linkLabel="Memories"
                    />
                  </>
                )}
                {feedSections.favorites.length > 0 && (
                  <>
                    <FeedSection
                      title="Favorites"
                      subtitle={`${feedSections.favorites.length} photos`}
                      photos={feedSections.favorites}
                      linkHref="/favorites"
                    />
                  </>
                )}
                {feedSections.topLocations.map(([location, locPhotos], index) => (
                  <div key={location} className={cn(index > 0 && "pt-1")}>
                    <FeedSection
                      title={location}
                      subtitle={`${(locPhotos as any[]).length} photos`}
                      photos={locPhotos as any[]}
                      linkHref="/map"
                      linkLabel="Map"
                    />
                  </div>
                ))}
              </>
            ) : null}

            {/* All photos section header */}
            <div className="pt-5 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  All Photos
                </h2>
                <button
                  onClick={() => setViewMode("grid")}
                  className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground font-medium bg-muted/50 px-3 py-1.5 rounded-full"
                >
                  Grid view
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

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
        )}

        {/* Grid mode */}
        {viewMode === "grid" && photos.length > 0 && (
          <div className="pb-8">
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
          </div>
        )}

        {/* Selection action bar */}
        {selectable && selectedIds.size > 0 && (
          <SelectionBar
            count={selectedIds.size}
            onFavorite={handleBulkFavorite}
            onArchive={handleBulkArchive}
            onTrash={handleBulkTrash}
            onAddToAlbum={() => setShowAddToAlbum(true)}
            onClear={() => {
              setSelectedIds(new Set());
              setSelectable(false);
            }}
          />
        )}

        <UploadDialog open={showUpload} onClose={() => setShowUpload(false)} />

        <AddToAlbumSheet
          photoIds={Array.from(selectedIds)}
          open={showAddToAlbum}
          onClose={() => setShowAddToAlbum(false)}
          onDone={() => {
            setSelectedIds(new Set());
            setSelectable(false);
          }}
        />
      </div>
    </div>
  );
}
