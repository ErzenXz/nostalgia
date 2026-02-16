"use client";

import Link from "next/link";
import { cn, formatRelativeDate } from "@/lib/utils";
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

interface AlbumCardProps {
  album: Album;
  className?: string;
}

export function AlbumCard({ album, className }: AlbumCardProps) {
  return (
    <Link
      href={`/albums/${album._id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-muted-foreground/30 hover:shadow-lg hover:shadow-black/10",
        className,
      )}
    >
      {/* Cover area */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-secondary to-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
        </div>

        {/* Shared indicator */}
        {album.isShared && (
          <div className="absolute top-2 right-2 rounded-full bg-black/40 p-1.5 backdrop-blur-sm">
            <Share2 className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground truncate">
          {album.name}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Images className="h-3 w-3" />
            <span>{album.photoCount}</span>
          </div>
          <span className="text-border">|</span>
          <span>{formatRelativeDate(album.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

interface AlbumGridProps {
  albums: Album[];
  emptyMessage?: string;
}

export function AlbumGrid({ albums, emptyMessage }: AlbumGridProps) {
  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">{emptyMessage ?? "No albums yet"}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 px-8 py-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {albums.map((album) => (
        <AlbumCard key={album._id} album={album} />
      ))}
    </div>
  );
}
