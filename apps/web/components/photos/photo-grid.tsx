"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import Image from "next/image";
import { cn, formatDate, groupPhotosByDate } from "@/lib/utils";
import { Heart, Check } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        {emptyIcon}
        <p className="mt-4 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // Group photos by date
  const grouped = groupPhotosByDate(photos);

  return (
    <div className="space-y-8 px-8 py-6">
      {Array.from(grouped.entries()).map(([dateKey, datePhotos]) => (
        <div key={dateKey}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
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
        "photo-grid-item group relative aspect-square cursor-pointer overflow-hidden rounded-md bg-secondary",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      onMouseEnter={() => onHover(photo._id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* Photo image/video or placeholder */}
      {displayUrl ? (
        isVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
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
            className="object-cover"
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

      {/* Hover overlay */}
      {(isHovered || isSelected) && (
        <div className="absolute inset-0 bg-black/20 transition-opacity" />
      )}

      {/* Selection checkbox */}
      {(selectable || isHovered) && (
        <button
          className={cn(
            "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
            isSelected ? "border-primary bg-primary" : "border-white/70 bg-black/30",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection();
          }}
        >
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </button>
      )}

      {/* Favorite button */}
      {isHovered && !selectable && (
        <button
          className="absolute right-2 top-2 rounded-full p-1 transition-colors hover:bg-black/40"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              photo.isFavorite ? "fill-red-500 text-red-500" : "text-white",
            )}
          />
        </button>
      )}

      {/* Location badge */}
      {photo.locationName && isHovered && (
        <div className="absolute bottom-2 left-2 right-2">
          <span className="inline-block max-w-full truncate rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
            {photo.locationName}
          </span>
        </div>
      )}
    </div>
  );
}
