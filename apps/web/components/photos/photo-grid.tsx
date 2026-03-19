"use client";

import { useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn, formatDate, groupPhotosByDate } from "@/lib/utils";
import { Heart, Check, MapPin, Play } from "lucide-react";
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
  stickyHeaders?: boolean;
  dateRefs?: React.MutableRefObject<Map<string, HTMLDivElement>>;
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
  stickyHeaders = false,
  dateRefs,
}: PhotoGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
        {emptyIcon}
        <p className="mt-4 text-sm font-light tracking-wide">{emptyMessage}</p>
      </div>
    );
  }

  const grouped = groupPhotosByDate(photos);

  return (
    <div className="space-y-8 px-4 md:px-8 py-6 max-w-[1600px] mx-auto">
      {Array.from(grouped.entries()).map(([dateKey, datePhotos]) => {
        // Pick the most common location name in this day group
        const locationCounts = new Map<string, number>();
        for (const p of datePhotos as Photo[]) {
          if (p.locationName) {
            locationCounts.set(p.locationName, (locationCounts.get(p.locationName) ?? 0) + 1);
          }
        }
        const topLocation =
          locationCounts.size > 0
            ? Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
            : null;

        return (
        <div
          key={dateKey}
          ref={(el) => {
            if (el && dateRefs?.current) {
              dateRefs.current.set(dateKey, el);
            }
          }}
        >
          <div
            className={cn(
              "mb-4 flex items-center gap-3",
              stickyHeaders &&
                "sticky top-16 z-20 bg-background/95 backdrop-blur-md py-3 -mx-4 md:-mx-8 px-4 md:px-8",
            )}
          >
            <span className="text-[16px] font-semibold text-foreground">
              {formatDate(new Date(dateKey))}
            </span>
            {topLocation && (
              <>
                <span className="text-muted-foreground text-[11px]">·</span>
                <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {topLocation}
                </span>
              </>
            )}
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-[12px] font-medium text-muted-foreground shrink-0 bg-muted px-2.5 py-0.5 rounded-full">
              {(datePhotos as Photo[]).length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
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
                      onPhotoClick?.(photo as any, index);
                    }
                  }}
                  onToggleSelection={() => toggleSelection(photo._id)}
                  onFavorite={() => onFavorite?.(photo._id)}
                />
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

function formatDuration(mimeType?: string) {
  if (mimeType?.startsWith("video/")) {
    return "0:00"; // Placeholder for video duration
  }
  return null;
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
  const duration = formatDuration(photo.mimeType);

  return (
    <div
      className={cn(
        "photo-grid-item group relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-xl bg-muted",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      onMouseEnter={() => onHover(photo._id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {displayUrl ? (
        isVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
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
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 20vw"
            unoptimized
          />
        )
      ) : (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      {/* Top Right Duration or Tag */}
      {duration && (
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10 pointer-events-none">
          <span className="text-[12px] font-medium text-white drop-shadow-md">
            {duration}
          </span>
        </div>
      )}

      {/* Center Play Button Overlay for Videos */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20">
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Selection checkbox */}
      {(selectable || isHovered || isSelected) && (
        <button
          type="button"
          className={cn(
            "absolute left-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200",
            "backdrop-blur-sm",
            isSelected
              ? "border-primary bg-primary"
              : "border-white/80 bg-black/20 opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection();
          }}
        >
          {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[3]" />}
        </button>
      )}

      {/* Progress Bar (Decorative) for Videos */}
      {isVideo && (
        <div className="absolute top-4 left-4 right-16 h-1 bg-white/30 rounded-full overflow-hidden z-10 pointer-events-none">
          <div className="h-full bg-white w-0 group-hover:w-1/3 rounded-full transition-all duration-1000 ease-out" />
        </div>
      )}

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 pointer-events-none">
        <h3 className="text-[16px] font-semibold text-white leading-tight mb-3 line-clamp-2 drop-shadow-sm">
          {photo.description || photo.locationName || photo.fileName}
        </h3>
        
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="h-6 w-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden shrink-0">
            {photo.locationName ? photo.locationName.charAt(0) : "U"}
          </div>
          <span className="text-[13px] font-medium text-white/90 drop-shadow-sm truncate">
            {photo.locationName || "You"}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite();
            }}
            className="text-white hover:scale-110 transition-transform p-1 opacity-0 group-hover:opacity-100"
          >
            <Heart className={cn("h-5 w-5", photo.isFavorite ? "fill-destructive text-destructive" : "text-white")} />
          </button>
        </div>
      </div>
    </div>
  );
}
