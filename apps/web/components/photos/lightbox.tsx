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
  Film,
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

// Film grain overlay component
function FilmGrain() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

// Vignette overlay component
function Vignette() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[55]"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
      }}
    />
  );
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
        <p className="text-sm font-light tracking-wide">Loading...</p>
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
    <div className="relative h-full w-full">
      {/* Warm color grading overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay opacity-20"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,200,150,0.3) 0%, rgba(200,150,100,0.2) 50%, rgba(150,100,50,0.3) 100%)",
        }}
      />
      <Image
        src={url}
        alt={alt}
        fill
        className="object-contain"
        sizes="100vw"
        unoptimized
        priority
      />
    </div>
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
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [isSliding, setIsSliding] = useState(false);
  const prevIndexRef = useRef(currentIndex);
  const photo = photos[currentIndex];

  // Opening animation
  useEffect(() => {
    const timer = setTimeout(() => setIsOpening(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Detect navigation direction for slide animation
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      setSlideDirection(currentIndex > prevIndexRef.current ? "left" : "right");
      setIsSliding(true);
      const timer = setTimeout(() => {
        setIsSliding(false);
        setSlideDirection(null);
      }, 300);
      prevIndexRef.current = currentIndex;
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 300);
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
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black transition-all duration-300 ease-out",
        isOpening && "opacity-0 scale-105",
        isClosing && "opacity-0 scale-95",
      )}
    >
      {/* Film grain overlay */}
      <FilmGrain />

      {/* Vignette effect */}
      <Vignette />

      {/* Top toolbar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 transition-opacity duration-300",
          "bg-gradient-to-b from-black/60 via-black/30 to-transparent",
          isOpening && "opacity-0",
        )}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            className="group flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
            <span className="text-xs font-light tracking-wide">Close</span>
          </button>
          <div className="flex items-center gap-2 text-white/50">
            <Film className="h-3.5 w-3.5" />
            <span className="text-xs font-light tracking-widest">
              {String(currentIndex + 1).padStart(2, "0")} /{" "}
              {String(photos.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ActionButton
            onClick={() => onFavorite?.(photo._id)}
            active={photo.isFavorite}
            activeColor="text-rose-400"
            tooltip="Favorite"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-all",
                photo.isFavorite && "fill-rose-400",
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
            activeColor="text-amber-400"
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

      {/* Photo container with slide animation */}
      <div
        className={cn(
          "relative flex h-full items-center justify-center transition-all duration-300 ease-out",
          showInfo ? "pr-96" : "",
          isSliding && slideDirection === "left" && "translate-x-[-20px] opacity-0",
          isSliding && slideDirection === "right" && "translate-x-20 opacity-0",
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
          className="group absolute left-6 top-1/2 z-20 -translate-y-1/2 transition-all duration-200"
          onClick={goPrev}
        >
          <div className="flex items-center gap-3 rounded-full bg-white/5 px-4 py-3 text-white/60 backdrop-blur-sm transition-all group-hover:bg-white/10 group-hover:text-white">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-xs font-light tracking-wide opacity-0 transition-opacity group-hover:opacity-100">
              Prev
            </span>
          </div>
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          className={cn(
            "group absolute top-1/2 z-20 -translate-y-1/2 transition-all duration-200",
            showInfo ? "right-[26rem]" : "right-6",
          )}
          onClick={goNext}
        >
          <div className="flex items-center gap-3 rounded-full bg-white/5 px-4 py-3 text-white/60 backdrop-blur-sm transition-all group-hover:bg-white/10 group-hover:text-white">
            <span className="text-xs font-light tracking-wide opacity-0 transition-opacity group-hover:opacity-100">
              Next
            </span>
            <ChevronRight className="h-5 w-5" />
          </div>
        </button>
      )}

      {/* Bottom info bar - always visible minimal info */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 transition-opacity duration-300",
          "bg-gradient-to-t from-black/60 via-black/30 to-transparent",
          !showInfo ? "opacity-100" : "opacity-0",
          isOpening && "opacity-0",
        )}
      >
        <div className="flex items-center gap-4">
          {photo.locationName && (
            <div className="flex items-center gap-1.5 text-white/60">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs font-light tracking-wide">
                {photo.locationName}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-white/60">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs font-light tracking-wide">
              {formatDate(photo.takenAt ?? photo.uploadedAt)}
            </span>
          </div>
        </div>
        {photo.description && (
          <p className="max-w-md truncate text-xs font-light tracking-wide text-white/50">
            {photo.description}
          </p>
        )}
      </div>

      {/* Info panel */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 z-30 w-96 overflow-y-auto border-l border-white/5 bg-black/80 backdrop-blur-xl transition-transform duration-300 ease-out",
          showInfo ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h3 className="text-lg font-light tracking-wide text-white/90">
              {photo.fileName}
            </h3>
            <p className="mt-1 text-xs font-light tracking-wide text-white/40">
              {(photo.sizeBytes / 1024 / 1024).toFixed(1)} MB • {photo.mimeType}
            </p>
          </div>

          {/* AI Processing Status */}
          <AiProcessingStatus photoId={photo._id} />

          {/* AI Description */}
          {photo.description && (
            <InfoSection icon={<Sparkles className="h-4 w-4 text-amber-400" />} title="Story">
              <p className="text-sm font-light leading-relaxed text-white/70">
                {photo.description}
              </p>
            </InfoSection>
          )}

          {/* Tags */}
          {photo.aiTags && photo.aiTags.length > 0 && (
            <InfoSection icon={<Tag className="h-4 w-4 text-sky-400" />} title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {photo.aiTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-white/10 bg-white/5 text-xs font-light text-white/60 hover:bg-white/10"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </InfoSection>
          )}

          {/* Date */}
          <InfoSection icon={<Calendar className="h-4 w-4 text-emerald-400" />} title="Date">
            <p className="text-sm font-light text-white/70">
              {formatDate(photo.takenAt ?? photo.uploadedAt)}
            </p>
          </InfoSection>

          {/* Location */}
          {photo.locationName && (
            <InfoSection icon={<MapPin className="h-4 w-4 text-rose-400" />} title="Location">
              <p className="text-sm font-light text-white/70">{photo.locationName}</p>
              {photo.latitude && photo.longitude && (
                <p className="mt-1 text-xs font-light text-white/40">
                  {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                </p>
              )}
            </InfoSection>
          )}

          {/* Camera */}
          {(photo.cameraMake || photo.cameraModel) && (
            <InfoSection icon={<Camera className="h-4 w-4 text-orange-400" />} title="Camera">
              <p className="text-sm font-light text-white/70">
                {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-light text-white/40">
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
                    className="h-8 w-8 rounded-lg border border-white/10 shadow-lg transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </InfoSection>
          )}

          {/* File info */}
          <div className="mt-8 border-t border-white/5 pt-6">
            <p className="text-xs font-light uppercase tracking-widest text-white/30">
              Technical
            </p>
            <div className="mt-3 space-y-1 text-xs font-light text-white/40">
              {photo.width && photo.height && (
                <p>
                  {photo.width} × {photo.height} pixels
                </p>
              )}
            </div>
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
        "rounded-full p-2.5 text-white/60 transition-all",
        "hover:bg-white/10 hover:text-white",
        active && "bg-white/10",
        active && activeColor,
        destructive && "hover:bg-rose-500/20 hover:text-rose-400",
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
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-light uppercase tracking-widest text-white/40">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
