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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
            <span className="text-sm">Close</span>
          </button>
          <span className="text-sm text-zinc-500">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ActionButton
            onClick={() => onFavorite?.(photo._id)}
            active={photo.isFavorite}
            activeColor="text-red-500"
            tooltip="Favorite"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                photo.isFavorite && "fill-red-500",
              )}
            />
          </ActionButton>
          <ActionButton onClick={() => onArchive?.(photo._id)} tooltip="Archive">
            <Archive className="h-4 w-4" />
          </ActionButton>
          <ActionButton tooltip="Share">
            <Share2 className="h-4 w-4" />
          </ActionButton>
          <ActionButton tooltip="Download">
            <Download className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            onClick={() => setShowInfo((v) => !v)}
            active={showInfo}
            activeColor="text-blue-400"
            tooltip="Info"
          >
            <Info className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            onClick={() => onTrash?.(photo._id)}
            tooltip="Delete"
            destructive
          >
            <Trash2 className="h-4 w-4" />
          </ActionButton>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Image container */}
        <div className="relative flex-1 flex items-center justify-center bg-black">
          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <button
              className="absolute left-4 z-10 flex items-center justify-center h-10 w-10 rounded-full bg-zinc-800/80 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              onClick={goPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          
          <LightboxImage
            storageKey={photo.storageKey}
            alt={photo.description || photo.fileName}
            mimeType={photo.mimeType}
            isEncrypted={(photo as any).isEncrypted}
          />
          
          {currentIndex < photos.length - 1 && (
            <button
              className="absolute right-4 z-10 flex items-center justify-center h-10 w-10 rounded-full bg-zinc-800/80 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              onClick={goNext}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Info panel - slides in from right */}
        <div
          className={cn(
            "w-80 border-l border-zinc-800 bg-zinc-900 overflow-y-auto transition-all duration-300",
            showInfo ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="p-5">
            {/* File name */}
            <div className="mb-6">
              <h3 className="text-base font-medium text-zinc-100 truncate">
                {photo.fileName}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {(photo.sizeBytes / 1024 / 1024).toFixed(1)} MB • {photo.mimeType}
              </p>
            </div>

            {/* AI Processing Status */}
            <AiProcessingStatus photoId={photo._id} />

            {/* Description */}
            {photo.description && (
              <InfoSection icon={<Sparkles className="h-4 w-4 text-purple-400" />} title="Story">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {photo.description}
                </p>
              </InfoSection>
            )}

            {/* Tags */}
            {photo.aiTags && photo.aiTags.length > 0 && (
              <InfoSection icon={<Tag className="h-4 w-4 text-blue-400" />} title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {photo.aiTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </InfoSection>
            )}

            {/* Date */}
            <InfoSection icon={<Calendar className="h-4 w-4 text-green-400" />} title="Date">
              <p className="text-sm text-zinc-300">
                {formatDate(photo.takenAt ?? photo.uploadedAt)}
              </p>
            </InfoSection>

            {/* Location */}
            {photo.locationName && (
              <InfoSection icon={<MapPin className="h-4 w-4 text-red-400" />} title="Location">
                <p className="text-sm text-zinc-300">{photo.locationName}</p>
                {photo.latitude && photo.longitude && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                  </p>
                )}
              </InfoSection>
            )}

            {/* Camera */}
            {(photo.cameraMake || photo.cameraModel) && (
              <InfoSection icon={<Camera className="h-4 w-4 text-orange-400" />} title="Camera">
                <p className="text-sm text-zinc-300">
                  {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
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
                <div className="flex gap-2">
                  {photo.dominantColors.map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded border border-zinc-700"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </InfoSection>
            )}

            {/* File info */}
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-600 mb-2">Technical</p>
              <div className="space-y-1 text-xs text-zinc-500">
                {photo.width && photo.height && (
                  <p>{photo.width} × {photo.height} px</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom info bar - minimal */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-4">
          {photo.locationName && (
            <div className="flex items-center gap-1.5 text-zinc-400">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs">{photo.locationName}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">
              {formatDate(photo.takenAt ?? photo.uploadedAt)}
            </span>
          </div>
        </div>
        {photo.description && (
          <p className="max-w-md truncate text-xs text-zinc-500">
            {photo.description}
          </p>
        )}
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
        "rounded-lg p-2 text-zinc-400 transition-colors",
        "hover:bg-zinc-800 hover:text-zinc-200",
        active && "bg-zinc-800",
        active && activeColor,
        destructive && "hover:bg-red-500/10 hover:text-red-400",
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
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-zinc-400">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
