"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  Suspense,
  memo,
} from "react";
import { useRouter } from "next/navigation";
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
  Loader2,
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
      className="group relative shrink-0 w-[180px] overflow-hidden rounded-lg film-print transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3]">
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
              sizes="180px"
              unoptimized
            />
          )
        ) : (
          <div className="absolute inset-0 bg-amber-950/20 animate-pulse" />
        )}
        {isVideo && (
          <div className="absolute bottom-1.5 right-1.5 rounded-sm bg-black/70 px-1.5 py-0.5 flex items-center gap-1">
            <Video className="h-2.5 w-2.5 text-amber-400/80" />
            <span className="text-[9px] font-mono text-amber-400/80 uppercase">Video</span>
          </div>
        )}
        {photo.isFavorite && (
          <div className="absolute top-1.5 right-1.5">
            <Heart className="h-3 w-3 fill-amber-500/80 text-amber-500/80" />
          </div>
        )}
      </div>
      <div className="px-2.5 pt-2 pb-2.5">
        <p className="text-[10px] font-mono text-foreground/75 line-clamp-1">
          {photo.description || photo.fileName}
        </p>
        {photo.locationName && (
          <p className="mt-0.5 text-[9px] font-mono text-amber-800/50 flex items-center gap-1">
            <MapPin className="h-2 w-2" />
            <span className="truncate">{photo.locationName}</span>
          </p>
        )}
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
      <div className="flex items-end justify-between px-4 md:px-8 mb-3">
        <div>
          <h2 className="text-sm font-heading font-semibold text-foreground/90">{title}</h2>
          {subtitle && (
            <p className="text-[9px] font-mono text-amber-800/45 uppercase tracking-wider mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {linkHref && (
          <Link
            href={linkHref}
            className="flex items-center gap-1 text-[10px] font-mono text-amber-700/55 hover:text-amber-500 transition-colors uppercase tracking-wider"
          >
            {linkLabel ?? "See all"}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 md:px-8 pb-2 scrollbar-none">
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
    <div className="flex gap-2 overflow-x-auto px-4 md:px-8 py-3 scrollbar-none border-b border-amber-900/12">
      {FILTER_CHIPS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-all duration-200 border",
            active === id
              ? "bg-amber-600/20 border-amber-600/40 text-amber-400/90"
              : "border-amber-900/20 text-amber-900/40 hover:border-amber-800/35 hover:text-amber-700/60",
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
    <div className="fixed bottom-0 inset-x-0 z-50 pb-safe lg:left-[--sidebar-width,240px]">
      <div className="mx-auto max-w-3xl m-4">
        <div className="rounded-xl border border-amber-800/25 bg-[#0f0e0d]/95 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.6)] flex items-center gap-2 px-4 py-3">
          <span className="text-[11px] font-mono text-amber-700/70 uppercase tracking-wider shrink-0">
            {count} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={onAddToAlbum}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider text-amber-700/60 hover:text-amber-400 border border-amber-900/20 hover:border-amber-700/35 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Album
          </button>
          <button
            onClick={onFavorite}
            className="p-2 rounded-sm text-amber-700/50 hover:text-amber-400 hover:bg-amber-950/30 transition-colors"
            title="Favorite"
          >
            <Heart className="h-4 w-4" />
          </button>
          <button
            onClick={onArchive}
            className="p-2 rounded-sm text-amber-700/50 hover:text-amber-400 hover:bg-amber-950/30 transition-colors"
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            onClick={onTrash}
            className="p-2 rounded-sm text-red-700/50 hover:text-red-400 hover:bg-red-950/20 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClear}
            className="p-2 rounded-sm text-amber-900/40 hover:text-amber-700/60 transition-colors ml-1"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ──────────────────────────────────────────

function PhotosContent() {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [showAddToAlbum, setShowAddToAlbum] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectable, setSelectable] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "grid">("feed");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
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

  const allPhotos = useMemo(() => photosResult?.photos ?? [], [photosResult]);

  // Apply active filter
  const photos = useMemo(() => {
    switch (activeFilter) {
      case "favorites":
        return allPhotos.filter((p: any) => p.isFavorite);
      case "videos":
        return allPhotos.filter(
          (p: any) =>
            typeof p.mimeType === "string" && p.mimeType.startsWith("video/"),
        );
      case "has-location":
        return allPhotos.filter(
          (p: any) => p.latitude != null || p.locationName,
        );
      case "by-camera":
        // Group by camera — return photos sorted by cameraMake/Model
        return [...allPhotos].sort((a: any, b: any) => {
          const ca = `${a.cameraMake ?? ""} ${a.cameraModel ?? ""}`.trim();
          const cb = `${b.cameraMake ?? ""} ${b.cameraModel ?? ""}`.trim();
          return ca.localeCompare(cb);
        });
      default:
        return allPhotos;
    }
  }, [allPhotos, activeFilter]);

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
    if (!allPhotos || allPhotos.length === 0 || activeFilter !== "all")
      return null;

    const now = Date.now();
    const dayMs = 86400000;

    const recent = allPhotos.filter((p: any) => {
      const t = p.takenAt ?? p.uploadedAt ?? p._creationTime;
      return now - t < dayMs * 7;
    });

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const thisYear = today.getFullYear();
    const onThisDay = allPhotos.filter((p: any) => {
      const d = new Date(p.takenAt ?? p.uploadedAt ?? p._creationTime);
      return (
        d.getMonth() === todayMonth &&
        d.getDate() === todayDay &&
        d.getFullYear() !== thisYear
      );
    });

    const locationMap = new Map<string, any[]>();
    for (const p of allPhotos) {
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
  }, [allPhotos, favorites, activeFilter]);

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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-800/40" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <PageHeader
        title="Photos"
        description={`${allPhotos.length} photo${allPhotos.length !== 1 ? "s" : ""}`}
      >
        <button
          onClick={toggleSelectMode}
          title={selectable ? "Exit selection" : "Select photos"}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border transition-colors",
            selectable
              ? "bg-amber-600/15 border-amber-600/35 text-amber-400/90"
              : "border-amber-900/22 text-amber-900/40 hover:border-amber-800/35 hover:text-amber-700/60",
          )}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {selectable ? "Done" : "Select"}
        </button>
        <button
          onClick={() => setViewMode(viewMode === "feed" ? "grid" : "feed")}
          title={viewMode === "feed" ? "Grid view" : "Feed view"}
          className="p-1.5 rounded-sm text-amber-900/40 hover:text-amber-700/60 border border-amber-900/15 hover:border-amber-800/30 transition-colors"
        >
          {viewMode === "feed" ? (
            <Grid3X3 className="h-4 w-4" />
          ) : (
            <LayoutGrid className="h-4 w-4" />
          )}
        </button>
        <Button
          size="sm"
          className="bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500 shadow-[0_2px_8px_rgba(201,166,107,0.2)] font-mono uppercase tracking-wider text-[10px]"
          onClick={() => setShowUpload(true)}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Button>
      </PageHeader>

      {/* Filter chips */}
      {allPhotos.length > 0 && (
        <FilterChips active={activeFilter} onChange={setActiveFilter} />
      )}

      {/* Empty state */}
      {allPhotos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-amber-900/30">
          <Images className="h-12 w-12 opacity-30 mb-4" />
          <p className="text-sm font-mono text-amber-900/40">
            Upload your first photos to get started
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-amber-900/25 text-amber-800/50"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4" />
            Upload Photos
          </Button>
        </div>
      )}

      {/* Filtered empty state */}
      {allPhotos.length > 0 && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-amber-900/30">
          <Images className="h-10 w-10 opacity-30 mb-3" />
          <p className="text-xs font-mono text-amber-900/40 uppercase tracking-wider">
            No photos match this filter
          </p>
        </div>
      )}

      {/* Feed mode */}
      {viewMode === "feed" && photos.length > 0 && (
        <div className="space-y-1 py-4">
          {feedSections ? (
            <>
              <FeedSection
                title="Recent"
                subtitle={`Last 7 days · ${feedSections.recent.length} photos`}
                photos={feedSections.recent}
              />
              {feedSections.onThisDay.length > 0 && (
                <>
                  <div className="h-px mx-4 md:mx-8 bg-amber-900/10" />
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
                  <div className="h-px mx-4 md:mx-8 bg-amber-900/10" />
                  <FeedSection
                    title="Favorites"
                    subtitle={`${feedSections.favorites.length} photos`}
                    photos={feedSections.favorites}
                    linkHref="/favorites"
                  />
                </>
              )}
              {feedSections.topLocations.map(([location, locPhotos]) => (
                <div key={location}>
                  <div className="h-px mx-4 md:mx-8 bg-amber-900/10" />
                  <FeedSection
                    title={location}
                    subtitle={`${(locPhotos as any[]).length} photos`}
                    photos={locPhotos as any[]}
                    linkHref="/map"
                    linkLabel="Map"
                  />
                </div>
              ))}
              <div className="h-px mx-4 md:mx-8 bg-amber-900/10" />
            </>
          ) : null}

          {/* All photos section header */}
          <div className="px-4 md:px-8 pt-5 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-foreground/90">
                All Photos
              </h2>
              <button
                onClick={() => setViewMode("grid")}
                className="flex items-center gap-1 text-[10px] font-mono text-amber-700/55 hover:text-amber-500 transition-colors uppercase tracking-wider"
              >
                Grid view
                <ChevronRight className="h-3 w-3" />
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
        <>
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
    </>
  );
}
