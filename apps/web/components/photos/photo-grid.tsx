"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import Image from "next/image";
import { cn, formatDate, groupPhotosByDate } from "@/lib/utils";
import { Heart, Check, MapPin } from "lucide-react";
import { usePhotoUrls } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";

interface Photo {
  _id: string;
  storageKey: string;
  thumbnailStorageKey?: string;
  fileName: string;
  mimeType: string;
  isEncrypted?: boolean;
  width?: number;
  height?: number;
  takenAt?: number;
  uploadedAt: number;
  isFavorite: boolean;
  description?: string;
  aiTags?: string[];
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo, index: number) => void;
  onFavorite?: (photoId: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
}

export function PhotoGrid({
  photos,
  onPhotoClick,
  onFavorite,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  emptyMessage = "No photos yet",
  emptyIcon,
}: PhotoGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Collect all storage keys to batch-fetch presigned URLs
  const storageKeys = useMemo(
    () => photos.map((p) => p.thumbnailStorageKey || p.storageKey),
    [photos],
  );
  const photoUrls = usePhotoUrls(storageKeys);

  const toggleSelection = useCallback(
    (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      onSelectionChange?.(newSet);
    },
    [selectedIds, onSelectionChange],
  );

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/40">
        {emptyIcon}
        <p className="mt-4 text-sm font-light tracking-wide">{emptyMessage}</p>
      </div>
    );
  }

  // Group photos by date
  const grouped = groupPhotosByDate(photos);

  return (
    <div className="space-y-8 px-8 py-6">
      {Array.from(grouped.entries()).map(([dateKey, datePhotos]) => (
        <div key={dateKey}>
          <h3 className="mb-3 text-xs font-light uppercase tracking-widest text-white/30">
            {formatDate(new Date(dateKey))}
          </h3>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {datePhotos.map((photo, index) => {
              const isSelected = selectedIds.has(photo._id);
              const isHovered = hoveredId === photo._id;
              const imageKey = photo.thumbnailStorageKey || photo.storageKey;
              const signedUrl = photoUrls.get(imageKey) ?? null;

              return (
                <PhotoGridCell
                  key={photo._id}
                  photo={photo}
                  index={index}
                  signedUrl={signedUrl}
                  imageKey={imageKey}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  selectable={selectable}
                  onHover={setHoveredId}
                  onClick={() => {
                    if (selectable) {
                      toggleSelection(photo._id);
                    } else {
                      onPhotoClick?.(photo, index);
                    }
                  }}
                  onToggleSelection={() => toggleSelection(photo._id)}
                  onFavorite={() => onFavorite?.(photo._id)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotoGridCell({
  photo,
  index: _index,
  signedUrl,
  imageKey,
  isSelected,
  isHovered,
  selectable,
  onHover,
  onClick,
  onToggleSelection,
  onFavorite,
}: {
  photo: Photo;
  index: number;
  signedUrl: string | null;
  imageKey: string;
  isSelected: boolean;
  isHovered: boolean;
  selectable: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  onToggleSelection: () => void;
  onFavorite: () => void;
}) {
  const isThumb = !!photo.thumbnailStorageKey && imageKey === photo.thumbnailStorageKey;
  const mimeTypeForKey = isThumb ? "image/jpeg" : photo.mimeType;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: mimeTypeForKey,
    enabled: !!photo.isEncrypted,
  });

  const displayUrl = photo.isEncrypted ? decryptedUrl : signedUrl;
  const isVideo = photo.mimeType.startsWith("video/");

  return (
    <div
      className={cn(
        "photo-grid-item group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-secondary",
        "transition-all duration-300 ease-out",
        isSelected && "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-background",
      )}
      onMouseEnter={() => onHover(photo._id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* Photo image/video or placeholder */}
      {displayUrl ? (
        isVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={displayUrl}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src={displayUrl}
            alt={photo.description || photo.fileName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 16vw, 12.5vw"
            unoptimized
          />
        )
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            {photo.fileName.slice(0, 12)}
          </div>
        </>
      )}

      {/* Vignette overlay - always visible, stronger on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-300 group-hover:opacity-60"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Warm color tint on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-20"
        style={{
          background: "linear-gradient(135deg, rgba(255,200,150,0.4) 0%, rgba(200,150,100,0.3) 100%)",
        }}
      />

      {/* Selection checkbox */}
      {(selectable || isHovered) && (
        <button
          className={cn(
            "absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200",
            "backdrop-blur-sm",
            isSelected
              ? "border-amber-400 bg-amber-400/90"
              : "border-white/60 bg-black/40 opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection();
          }}
        >
          {isSelected && <Check className="h-3 w-3 text-black" />}
        </button>
      )}

      {/* Favorite button */}
      {isHovered && !selectable && (
        <button
          className="absolute right-2 top-2 z-10 rounded-full bg-black/40 p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-all",
              photo.isFavorite ? "fill-rose-400 text-rose-400" : "text-white/80 hover:text-white",
            )}
          />
        </button>
      )}

      {/* Bottom gradient for text */}
      {isHovered && !selectable && (photo.locationName || photo.takenAt) && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {photo.locationName && (
            <div className="flex items-center gap-1 text-white/80">
              <MapPin className="h-2.5 w-2.5" />
              <span className="truncate text-[10px] font-light tracking-wide">
                {photo.locationName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Film strip effect on edges */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}
