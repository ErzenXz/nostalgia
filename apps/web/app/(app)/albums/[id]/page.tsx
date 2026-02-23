"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { AddPhotosSheet } from "@/components/albums/add-photos-sheet";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Share2,
  Images,
  Loader2,
  Camera,
  MapPin,
  Users,
  CalendarDays,
  CheckSquare,
  X,
  Trash2,
  MinusCircle,
  LayoutGrid,
  Clock,
  PlusCircle,
} from "lucide-react";

// ─── Cinematic cover ──────────────────────────────────────

const CinematicCover = memo(function CinematicCover({
  photo,
}: {
  photo: { storageKey: string; thumbnailStorageKey?: string; isEncrypted?: boolean; mimeType?: string };
}) {
  const imageKey = photo.thumbnailStorageKey || photo.storageKey;
  const signedUrl = usePhotoUrl(imageKey);
  const isThumb = !!photo.thumbnailStorageKey && imageKey === photo.thumbnailStorageKey;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: isThumb ? "image/jpeg" : (photo.mimeType ?? "image/jpeg"),
    enabled: !!photo.isEncrypted,
  });
  const url = photo.isEncrypted ? decryptedUrl : signedUrl;

  return (
    <>
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/30 to-[#0a0908]" />
      )}
    </>
  );
});

// ─── Stat pill ────────────────────────────────────────────

function StatPill({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-amber-950/30 border border-amber-900/18 text-[10px] font-mono text-amber-700/60 uppercase tracking-wider shrink-0">
      <span className="text-amber-600/60">{icon}</span>
      {value}
    </div>
  );
}

// ─── Album Detail ─────────────────────────────────────────

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectable, setSelectable] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"grid" | "timeline">("grid");
  const [showAddPhotos, setShowAddPhotos] = useState(false);

  const album = useQuery(api.albums.getById, { albumId: albumId as any });
  const albumPhotos = useQuery(api.albums.getPhotos, { albumId: albumId as any });

  const shareAlbum = useMutation(api.albums.shareAlbum);
  const removePhoto = useMutation(api.albums.removePhoto);
  const trashPhoto = useMutation(api.photos.trash);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);

  const isLoading = album === undefined || albumPhotos === undefined;
  const photos = useMemo(
    () => (albumPhotos ?? []).filter((p): p is NonNullable<typeof p> => p !== null),
    [albumPhotos],
  );

  // Compute stats from photos
  const stats = useMemo(() => {
    if (photos.length === 0) return null;
    const cameras = new Set(
      photos
        .map((p: any) => [p.cameraMake, p.cameraModel].filter(Boolean).join(" "))
        .filter(Boolean),
    );
    const places = new Set(
      photos.map((p: any) => p.locationName).filter(Boolean),
    );
    const withFaces = photos.filter(
      (p: any) => p.faces && p.faces.length > 0,
    ).length;
    const dates = photos
      .map((p: any) => p.takenAt ?? p._creationTime)
      .filter(Boolean)
      .sort((a: number, b: number) => a - b);
    const spanDays =
      dates.length > 1
        ? Math.round((dates[dates.length - 1] - dates[0]) / 86400000)
        : 0;

    return {
      cameras: cameras.size,
      places: places.size,
      faces: withFaces,
      spanDays,
    };
  }, [photos]);

  const handleShare = useCallback(async () => {
    if (!albumId) return;
    try {
      const token = await shareAlbum({ albumId: albumId as any });
      const url = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error("Failed to share album:", err);
    }
  }, [albumId, shareAlbum]);

  const handleRemoveSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await Promise.all(
      Array.from(selectedIds).map((photoId) =>
        removePhoto({ albumId: albumId as any, photoId: photoId as any }),
      ),
    );
    setSelectedIds(new Set());
    setSelectable(false);
  }, [selectedIds, albumId, removePhoto]);

  const handleTrashSelected = useCallback(() => {
    selectedIds.forEach((id) => trashPhoto({ photoId: id as any }));
    setSelectedIds(new Set());
    setSelectable(false);
  }, [selectedIds, trashPhoto]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-800/40" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-amber-900/30">
        <Images className="h-12 w-12 opacity-30 mb-4" />
        <p className="text-sm font-mono text-amber-900/40">Album not found</p>
        <Link href="/albums" className="mt-4">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-amber-900/25 text-[10px] font-mono text-amber-800/50 hover:text-amber-600/70 uppercase tracking-wider transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Albums
          </button>
        </Link>
      </div>
    );
  }

  const coverPhoto = photos[0] ?? null;

  return (
    <>
      {/* ── Cinematic Header ── */}
      <div className="relative h-[240px] md:h-[280px] w-full overflow-hidden bg-[#0a0908]">
        {coverPhoto && <CinematicCover photo={coverPhoto} />}

        {/* Blur + gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        {coverPhoto && (
          <div className="absolute inset-0 backdrop-blur-[2px] bg-black/20" style={{ maskImage: "linear-gradient(to top, transparent 50%, black 100%)" }} />
        )}

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/albums">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-white/60 hover:text-white/90 transition-colors uppercase tracking-wider">
              <ArrowLeft className="h-3.5 w-3.5" />
              Albums
            </button>
          </Link>
        </div>

        {/* Top-right action buttons */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={() => setShowAddPhotos(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-white/60 hover:text-white/90 transition-colors uppercase tracking-wider"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-white/60 hover:text-white/90 transition-colors uppercase tracking-wider"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>

        {/* Album info overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-8 pb-5">
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground/95 drop-shadow-sm">
            {album.name}
          </h1>
          <p className="text-[10px] font-mono text-amber-800/60 mt-1 uppercase tracking-wider">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
            {album.description ? ` · ${album.description}` : ""}
          </p>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {stats && (stats.cameras > 0 || stats.places > 0 || stats.spanDays > 0) && (
        <div className="flex gap-2 overflow-x-auto px-4 md:px-8 py-3 border-b border-amber-900/10 scrollbar-none">
          {stats.cameras > 0 && (
            <StatPill icon={<Camera className="h-3 w-3" />} value={`${stats.cameras} camera${stats.cameras !== 1 ? "s" : ""}`} />
          )}
          {stats.places > 0 && (
            <StatPill icon={<MapPin className="h-3 w-3" />} value={`${stats.places} location${stats.places !== 1 ? "s" : ""}`} />
          )}
          {stats.faces > 0 && (
            <StatPill icon={<Users className="h-3 w-3" />} value={`${stats.faces} with people`} />
          )}
          {stats.spanDays > 0 && (
            <StatPill icon={<CalendarDays className="h-3 w-3" />} value={`${stats.spanDays} day${stats.spanDays !== 1 ? "s" : ""} span`} />
          )}
        </div>
      )}

      {/* ── Tab bar + actions ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-2 border-b border-amber-900/10">
        <div className="flex items-center gap-0.5">
          {(["grid", "timeline"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-colors",
                activeTab === tab
                  ? "bg-amber-600/15 text-amber-400/90"
                  : "text-amber-900/40 hover:text-amber-700/60",
              )}
            >
              {tab === "grid" ? (
                <LayoutGrid className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {tab === "grid" ? "Grid" : "Timeline"}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setSelectable((v) => !v);
            setSelectedIds(new Set());
          }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border transition-colors",
            selectable
              ? "bg-amber-600/15 border-amber-600/35 text-amber-400/90"
              : "border-amber-900/20 text-amber-900/40 hover:border-amber-800/35 hover:text-amber-700/60",
          )}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {selectable ? "Done" : "Select"}
        </button>
      </div>

      {/* ── Photos ── */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-amber-900/30">
          <Images className="h-12 w-12 opacity-30 mb-4" />
          <p className="text-xs font-mono text-amber-900/40">No photos in this album yet</p>
        </div>
      ) : (
        <PhotoGrid
          photos={photos}
          onPhotoClick={(_, index) => {
            if (!selectable) setLightboxIndex(index);
          }}
          onFavorite={(id) => toggleFavorite({ photoId: id as any })}
          selectable={selectable}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage="No photos in this album"
          emptyIcon={<Images className="h-12 w-12 opacity-50" />}
          stickyHeaders={activeTab === "timeline"}
        />
      )}

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onFavorite={(id) => toggleFavorite({ photoId: id as any })}
          onTrash={(id) => {
            trashPhoto({ photoId: id as any });
            setLightboxIndex(null);
          }}
        />
      )}

      {/* ── Selection action bar ── */}
      {selectable && selectedIds.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 pb-safe lg:left-[--sidebar-width,240px]">
          <div className="mx-auto max-w-2xl m-4">
            <div className="rounded-xl border border-amber-800/25 bg-[#0f0e0d]/95 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.6)] flex items-center gap-2 px-4 py-3">
              <span className="text-[11px] font-mono text-amber-700/70 uppercase tracking-wider shrink-0">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <button
                onClick={() => void handleRemoveSelected()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider text-amber-700/60 hover:text-amber-400 border border-amber-900/20 hover:border-amber-700/35 transition-colors"
              >
                <MinusCircle className="h-3.5 w-3.5" />
                Remove
              </button>
              <button
                onClick={handleTrashSelected}
                className="p-2 rounded-sm text-red-700/50 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                title="Delete permanently"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedIds(new Set());
                  setSelectable(false);
                }}
                className="p-2 rounded-sm text-amber-900/40 hover:text-amber-700/60 transition-colors ml-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Photos Sheet ── */}
      <AddPhotosSheet
        albumId={albumId}
        existingPhotoIds={new Set(photos.map((p: any) => p._id))}
        open={showAddPhotos}
        onClose={() => setShowAddPhotos(false)}
      />
    </>
  );
}
