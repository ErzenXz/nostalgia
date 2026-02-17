"use client";

import { useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

interface VirtualPhotoGridProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo, index: number) => void;
  onFavorite?: (photoId: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  columns?: number;
}

interface RowData {
  type: "header";
  dateKey: string;
  label: string;
} | {
  type: "photos";
  photos: Photo[];
  startIndex: number;
}

export function VirtualPhotoGrid({
  photos,
  onPhotoClick,
  onFavorite,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  emptyMessage = "No photos yet",
  emptyIcon,
  columns: columnsProp,
}: VirtualPhotoGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Responsive column count
  const columns = columnsProp ?? Math.max(2, Math.min(8, Math.floor(containerWidth / 160)));

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // Build flat row structure: header rows + photo rows
  const rows: RowData[] = useMemo(() => {
    if (photos.length === 0) return [];
    const grouped = groupPhotosByDate(photos);
    const result: RowData[] = [];
    let globalIndex = 0;

    for (const [dateKey, datePhotos] of grouped.entries()) {
      result.push({
        type: "header",
        dateKey,
        label: formatDate(new Date(dateKey)),
      });

      // Chunk photos into rows of `columns` items
      for (let i = 0; i < datePhotos.length; i += columns) {
        result.push({
          type: "photos",
          photos: datePhotos.slice(i, i + columns),
          startIndex: globalIndex + i,
        });
      }
      globalIndex += datePhotos.length;
    }
    return result;
  }, [photos, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row) return 100;
      return row.type === "header" ? 40 : (containerWidth / columns) + 4;
    },
    overscan: 5,
  });

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
        {emptyIcon}
        <p className="mt-4 text-sm font-light tracking-wide">{emptyMessage}</p>
      </div>
    );
  }

  const cellSize = columns > 0 ? containerWidth / columns : 160;

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-120px)] overflow-auto px-4 md:px-8 py-4"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;

          if (row.type === "header") {
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-end pb-1"
              >
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
                  {row.label}
                </h3>
              </div>
            );
          }

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="flex gap-1"
            >
              {row.photos.map((photo, i) => {
                const globalIndex = row.startIndex + i;
                const isSelected = selectedIds.has(photo._id);
                const isHovered = hoveredId === photo._id;
                const imageKey = photo.thumbnailStorageKey || photo.storageKey;
                const signedUrl = photoUrls.get(imageKey) ?? null;

                return (
                  <VirtualCell
                    key={photo._id}
                    photo={photo}
                    signedUrl={signedUrl}
                    imageKey={imageKey}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    selectable={selectable}
                    cellSize={cellSize}
                    onHover={setHoveredId}
                    onClick={() => {
                      if (selectable) {
                        toggleSelection(photo._id);
                      } else {
                        onPhotoClick?.(photo, globalIndex);
                      }
                    }}
                    onToggleSelection={() => toggleSelection(photo._id)}
                    onFavorite={() => onFavorite?.(photo._id)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VirtualCell({
  photo,
  signedUrl,
  imageKey,
  isSelected,
  isHovered,
  selectable,
  cellSize,
  onHover,
  onClick,
  onToggleSelection,
  onFavorite,
}: {
  photo: Photo;
  signedUrl: string | null;
  imageKey: string;
  isSelected: boolean;
  isHovered: boolean;
  selectable: boolean;
  cellSize: number;
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
        "photo-grid-item group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-secondary/50",
        isSelected && "ring-2 ring-primary/70 ring-offset-2 ring-offset-background",
      )}
      style={{ width: cellSize - 4, height: cellSize - 4 }}
      onMouseEnter={() => onHover(photo._id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
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
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes={`${Math.round(cellSize)}px`}
            unoptimized
          />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 to-muted/60 animate-pulse" />
      )}

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-300 group-hover:opacity-50"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Selection */}
      {(selectable || isHovered) && (
        <button
          type="button"
          className={cn(
            "absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 backdrop-blur-sm",
            isSelected
              ? "border-primary bg-primary/90"
              : "border-white/60 bg-black/40 opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection();
          }}
        >
          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
        </button>
      )}

      {/* Favorite */}
      {isHovered && !selectable && (
        <button
          type="button"
          className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/40 p-1 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5 transition-all",
              photo.isFavorite ? "fill-red-500 text-red-500" : "text-white/80",
            )}
          />
        </button>
      )}
    </div>
  );
}
