"use client";

import Link from "next/link";
import Image from "next/image";
import { memo } from "react";
import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { cn } from "@/lib/utils";
import { usePhotoUrl, usePhotoUrls } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { FolderOpen, Share2, Images } from "lucide-react";

interface Album {
  _id: string;
  name: string;
  description?: string;
  photoCount: number;
  isShared: boolean;
  createdAt: number;
  updatedAt: number;
}

// ─── Single cover photo cell ──────────────────────────────

const CoverCell = memo(function CoverCell({
  photo,
  className,
}: {
  photo: { storageKey: string; thumbnailStorageKey?: string; isEncrypted?: boolean; mimeType?: string };
  className?: string;
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
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          className="object-cover"
          sizes="120px"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
});

// ─── Mosaic cover (loads cover photos via Convex) ─────────

function AlbumMosaicCover({ albumId }: { albumId: string }) {
  const coverPhotos = useQuery(api.albums.getCoverPhotos, {
    albumId: albumId as any,
  });

  if (!coverPhotos || coverPhotos.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted">
        <FolderOpen className="h-8 w-8 text-muted-foreground opacity-50" />
      </div>
    );
  }

  const validPhotos: Array<{ _id: string; storageKey: string; thumbnailStorageKey?: string; isEncrypted?: boolean; mimeType?: string }> = coverPhotos.filter(
    (p: any): p is NonNullable<typeof p> => p != null && typeof p.storageKey === "string",
  );

  if (validPhotos.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted">
        <FolderOpen className="h-8 w-8 text-muted-foreground opacity-50" />
      </div>
    );
  }

  if (validPhotos.length === 1) {
    return <CoverCell photo={validPhotos[0]!} className="absolute inset-0" />;
  }

  if (validPhotos.length < 4) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-[1px] bg-background">
        {validPhotos.map((p) => (
          <CoverCell key={p._id} photo={p} className="w-full h-full" />
        ))}
      </div>
    );
  }

  // 2×2 mosaic
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[1px] bg-background">
      {validPhotos.slice(0, 4).map((p) => (
        <CoverCell key={p._id} photo={p} className="w-full h-full" />
      ))}
    </div>
  );
}

// ─── Album Card ───────────────────────────────────────────

export function AlbumCard({ album, className }: { album: Album; className?: string }) {
  const startYear = new Date(album.createdAt).getFullYear();
  const endYear = new Date(album.updatedAt).getFullYear();
  const yearRange = startYear === endYear ? `${startYear}` : `${startYear} – ${endYear}`;

  return (
    <Link
      href={`/albums/${album._id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md",
        className,
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] overflow-hidden border-b border-border">
        <AlbumMosaicCover albumId={album._id} />

        {/* Overlay gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Shared badge */}
        {album.isShared && (
          <div className="absolute top-2 right-2 rounded-full bg-background/80 backdrop-blur-md p-1.5 shadow-sm border border-border">
            <Share2 className="h-3 w-3 text-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <h3 className="text-[14px] font-semibold text-foreground truncate">
          {album.name}
        </h3>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <Images className="h-3.5 w-3.5" />
            {album.photoCount}
          </div>
          <span className="text-border">·</span>
          <span className="text-[12px] font-medium text-muted-foreground">{yearRange}</span>
        </div>
        {album.description && (
          <p className="mt-1.5 text-[12px] text-muted-foreground line-clamp-1">{album.description}</p>
        )}
      </div>
    </Link>
  );
}

// ─── Smart Album Card (no mosaic, computed data) ──────────

export function SmartAlbumCard({
  icon,
  label,
  count,
  subtitle,
  href,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  subtitle?: string;
  href: string;
  gradient?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-end overflow-hidden rounded-xl shrink-0 w-[160px] h-[120px] transition-all duration-300 hover:-translate-y-0.5 border border-border",
        gradient ?? "bg-muted text-foreground",
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
        {icon}
      </div>
      <div className="relative z-10 px-4 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
          {subtitle ?? "Smart Album"}
        </p>
        <h3 className="text-[15px] font-semibold leading-tight mb-0.5">{label}</h3>
        <p className="text-[12px] font-medium opacity-80">{count} photos</p>
      </div>
    </Link>
  );
}

// ─── Album Grid ───────────────────────────────────────────

export function AlbumGrid({
  albums,
  emptyMessage,
}: {
  albums: Album[];
  emptyMessage?: string;
}) {
  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-[14px] font-medium">{emptyMessage ?? "No albums yet"}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {albums.map((album) => (
        <AlbumCard key={album._id} album={album} />
      ))}
    </div>
  );
}
