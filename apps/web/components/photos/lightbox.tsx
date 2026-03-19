"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  onRestore?: (photoId: string) => void;
  isTrashView?: boolean;
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
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <Camera className="h-12 w-12 animate-pulse" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        className="h-full w-full object-contain"
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

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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
          handleClose();
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
  }, [handleClose, goNext, goPrev]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
          <span className="text-[13px] font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ActionButton
            onClick={() => onFavorite?.(photo._id)}
            active={photo.isFavorite}
            activeColor="text-destructive fill-destructive"
            tooltip="Favorite"
          >
            <Heart className="h-4.5 w-4.5" />
          </ActionButton>
          <ActionButton onClick={() => onArchive?.(photo._id)} tooltip="Archive">
            <Archive className="h-4.5 w-4.5" />
          </ActionButton>
          <ActionButton tooltip="Share">
            <Share2 className="h-4.5 w-4.5" />
          </ActionButton>
          <ActionButton tooltip="Download">
            <Download className="h-4.5 w-4.5" />
          </ActionButton>
          <ActionButton
            onClick={() => setShowInfo((v) => !v)}
            active={showInfo}
            activeColor="text-foreground bg-muted"
            tooltip="Info"
          >
            <Info className="h-4.5 w-4.5" />
          </ActionButton>
          <ActionButton
            onClick={() => onTrash?.(photo._id)}
            tooltip="Delete"
            destructive
          >
            <Trash2 className="h-4.5 w-4.5" />
          </ActionButton>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Image container */}
        <div className="relative flex-1 flex items-center justify-center p-4 md:p-8">
          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <button
              className="absolute left-4 md:left-8 z-10 flex items-center justify-center h-12 w-12 rounded-full bg-background/80 backdrop-blur-md border border-border text-foreground transition-transform hover:scale-105 shadow-sm"
              onClick={goPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          
          <div className="relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
            <LightboxImage
              storageKey={photo.storageKey}
              alt={photo.description || photo.fileName}
              mimeType={photo.mimeType}
              isEncrypted={(photo as any).isEncrypted}
            />
          </div>
          
          {currentIndex < photos.length - 1 && (
            <button
              className="absolute right-4 md:right-8 z-10 flex items-center justify-center h-12 w-12 rounded-full bg-background/80 backdrop-blur-md border border-border text-foreground transition-transform hover:scale-105 shadow-sm"
              onClick={goNext}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Info panel - slides in from right */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-80 border-l border-border bg-card/95 backdrop-blur-xl overflow-y-auto transition-transform duration-300 shadow-2xl z-20",
            showInfo ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="p-6">
            {/* File name */}
            <div className="mb-6">
              <h3 className="text-[15px] font-semibold text-foreground truncate">
                {photo.fileName}
              </h3>
              <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                {(photo.sizeBytes / 1024 / 1024).toFixed(1)} MB • {photo.mimeType.split("/").pop()?.toUpperCase()}
              </p>
            </div>

            {/* AI Processing Status */}
            <div className="mb-6">
              <AiProcessingStatus photoId={photo._id} />
            </div>

            {/* Description */}
            {photo.description && (
              <InfoSection icon={<Sparkles className="h-4.5 w-4.5 text-primary" />} title="Story">
                <p className="text-[13px] text-foreground leading-relaxed">
                  {photo.description}
                </p>
              </InfoSection>
            )}

            {/* Tags */}
            {photo.aiTags && photo.aiTags.length > 0 && (
              <InfoSection icon={<Tag className="h-4.5 w-4.5 text-muted-foreground" />} title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {photo.aiTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[11px] font-medium px-2 py-0.5"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </InfoSection>
            )}

            {/* Date */}
            <InfoSection icon={<Calendar className="h-4.5 w-4.5 text-muted-foreground" />} title="Date">
              <p className="text-[13px] font-medium text-foreground">
                {formatDate(photo.takenAt ?? photo.uploadedAt)}
              </p>
            </InfoSection>

            {/* Location */}
            {photo.locationName && (
              <InfoSection icon={<MapPin className="h-4.5 w-4.5 text-muted-foreground" />} title="Location">
                <p className="text-[13px] font-medium text-foreground">{photo.locationName}</p>
                {photo.latitude && photo.longitude && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                  </p>
                )}
              </InfoSection>
            )}

            {/* Camera */}
            {(photo.cameraMake || photo.cameraModel) && (
              <InfoSection icon={<Camera className="h-4.5 w-4.5 text-muted-foreground" />} title="Camera">
                <p className="text-[13px] font-medium text-foreground">
                  {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-medium">
                  {photo.focalLength && <span>{photo.focalLength}</span>}
                  {photo.aperture && <span>f/{photo.aperture}</span>}
                  {photo.iso && <span>ISO {photo.iso}</span>}
                  {photo.exposureTime && <span>{photo.exposureTime}s</span>}
                </div>
              </InfoSection>
            )}

            {/* Colors */}
            {photo.dominantColors && photo.dominantColors.length > 0 && (
              <InfoSection title="Palette">
                <div className="flex gap-2.5">
                  {photo.dominantColors.map((color, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </InfoSection>
            )}

            {/* File info */}
            <div className="mt-8 pt-5 border-t border-border">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Technical Details</p>
              <div className="space-y-1.5 text-[12px] text-muted-foreground">
                {photo.width && photo.height && (
                  <p className="flex justify-between">
                    <span>Dimensions</span>
                    <span className="font-medium text-foreground">{photo.width} × {photo.height} px</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom info bar - minimal */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-6">
          {photo.locationName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-[12px] font-medium">{photo.locationName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-[12px] font-medium">
              {formatDate(photo.takenAt ?? photo.uploadedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Action button component
function ActionButton({
  children,
  onClick,
  active,
  activeColor,
  tooltip,
  destructive,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
  tooltip?: string;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "rounded-full p-2.5 text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground",
        active && activeColor,
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

// Info section component
function InfoSection({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center gap-2">
        {icon}
        <span className="text-[13px] font-semibold text-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
