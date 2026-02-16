"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  Trash2,
  Info,
  MapPin,
  Calendar,
  Camera,
  Tag,
  Sparkles,
  Archive,
  Share2,
} from "lucide-react";
import { AiProcessingStatus } from "@/components/photos/ai-processing-status";

interface Photo {
  _id: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  takenAt?: number;
  uploadedAt: number;
  cameraMake?: string;
  cameraModel?: string;
  focalLength?: string;
  aperture?: string;
  iso?: number;
  exposureTime?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  description?: string;
  aiTags?: string[];
  isFavorite: boolean;
  dominantColors?: string[];
}

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onFavorite?: (photoId: string) => void;
  onArchive?: (photoId: string) => void;
  onTrash?: (photoId: string) => void;
}

function LightboxImage({
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
      <div className="flex flex-col items-center gap-4 text-white/50">
        <Camera className="h-16 w-16 animate-pulse" />
        <p className="text-sm">Loading...</p>
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

export function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onFavorite,
  onArchive,
  onTrash,
}: LightboxProps) {
  const [showInfo, setShowInfo] = useState(false);
  const photo = photos[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "i":
          setShowInfo((v) => !v);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goNext, goPrev]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Top toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5 text-white" />
          </Button>
          <span className="text-sm text-white/70">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onFavorite?.(photo._id)}
          >
            <Heart
              className={cn(
                "h-5 w-5",
                photo.isFavorite ? "fill-red-500 text-red-500" : "text-white",
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onArchive?.(photo._id)}
          >
            <Archive className="h-5 w-5 text-white" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Share2 className="h-5 w-5 text-white" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Download className="h-5 w-5 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowInfo((v) => !v)}
          >
            <Info
              className={cn(
                "h-5 w-5",
                showInfo ? "text-primary" : "text-white",
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onTrash?.(photo._id)}
          >
            <Trash2 className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Photo */}
      <div
        className={cn(
          "relative flex h-full items-center justify-center transition-all",
          showInfo ? "pr-80" : "",
        )}
      >
        <LightboxImage
          storageKey={photo.storageKey}
          alt={photo.description || photo.fileName}
          mimeType={photo.mimeType}
          isEncrypted={(photo as any).isEncrypted}
        />
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
          onClick={goPrev}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition-colors",
            showInfo ? "right-84" : "right-4",
          )}
          onClick={goNext}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Info panel */}
      {showInfo && (
        <div className="absolute right-0 top-0 bottom-0 w-80 border-l border-white/10 bg-card overflow-y-auto">
          <div className="p-6 space-y-6">
            <h3 className="font-semibold text-foreground">{photo.fileName}</h3>

            {/* AI Processing Status */}
            <AiProcessingStatus photoId={photo._id} />

            {/* AI Description */}
            {photo.description && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    AI Description
                  </span>
                </div>
                <p className="text-sm text-foreground/80">
                  {photo.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {photo.aiTags && photo.aiTags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tags
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {photo.aiTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-green-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </span>
              </div>
              <p className="text-sm text-foreground/80">
                {formatDate(photo.takenAt ?? photo.uploadedAt)}
              </p>
            </div>

            {/* Location */}
            {photo.locationName && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-red-400" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Location
                  </span>
                </div>
                <p className="text-sm text-foreground/80">
                  {photo.locationName}
                </p>
                {photo.latitude && photo.longitude && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            )}

            {/* Camera */}
            {(photo.cameraMake || photo.cameraModel) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Camera
                  </span>
                </div>
                <p className="text-sm text-foreground/80">
                  {[photo.cameraMake, photo.cameraModel]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {photo.focalLength && <span>{photo.focalLength}</span>}
                  {photo.aperture && <span>f/{photo.aperture}</span>}
                  {photo.iso && <span>ISO {photo.iso}</span>}
                  {photo.exposureTime && <span>{photo.exposureTime}s</span>}
                </div>
              </div>
            )}

            {/* Colors */}
            {photo.dominantColors && photo.dominantColors.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Colors
                </span>
                <div className="mt-2 flex gap-1.5">
                  {photo.dominantColors.map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* File info */}
            <div className="border-t border-border pt-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                File Details
              </span>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {photo.width && photo.height && (
                  <p>
                    {photo.width} x {photo.height}
                  </p>
                )}
                <p>{(photo.sizeBytes / 1024 / 1024).toFixed(1)} MB</p>
                <p>{photo.mimeType}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
