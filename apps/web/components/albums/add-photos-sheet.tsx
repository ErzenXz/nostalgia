"use client";

import { useState, useMemo, useCallback, memo } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePhotoUrl, usePhotoUrls } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Loader2,
  Search,
  Images,
  PlusCircle,
} from "lucide-react";

// ─── Selectable photo cell ────────────────────────────────

const SelectableCell = memo(function SelectableCell({
  photo,
  signedUrl,
  selected,
  onToggle,
}: {
  photo: any;
  signedUrl: string | null;
  selected: boolean;
  onToggle: () => void;
}) {
  const imageKey = photo.thumbnailStorageKey || photo.storageKey;
  const isThumb = !!photo.thumbnailStorageKey && imageKey === photo.thumbnailStorageKey;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: isThumb ? "image/jpeg" : photo.mimeType,
    enabled: !!photo.isEncrypted,
  });
  const url = photo.isEncrypted ? decryptedUrl : signedUrl;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative aspect-square overflow-hidden rounded-lg transition-all duration-150",
        selected
          ? "ring-2 ring-amber-500/80 ring-offset-1 ring-offset-[#0a0908]"
          : "ring-1 ring-transparent hover:ring-amber-800/40",
      )}
    >
      {url ? (
        <Image
          src={url}
          alt={photo.fileName}
          fill
          className="object-cover"
          sizes="120px"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-amber-950/20 animate-pulse" />
      )}

      {/* Selection overlay */}
      {selected && (
        <div className="absolute inset-0 bg-amber-500/20" />
      )}

      {/* Checkbox */}
      <div
        className={cn(
          "absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          selected
            ? "bg-amber-500 border-amber-500"
            : "bg-black/40 border-white/40",
        )}
      >
        {selected && <Check className="h-3 w-3 text-amber-950" strokeWidth={3} />}
      </div>
    </button>
  );
});

// ─── Add Photos Sheet ─────────────────────────────────────

interface AddPhotosSheetProps {
  albumId: string;
  /** IDs of photos already in the album — to exclude them */
  existingPhotoIds: Set<string>;
  open: boolean;
  onClose: () => void;
}

export function AddPhotosSheet({
  albumId,
  existingPhotoIds,
  open,
  onClose,
}: AddPhotosSheetProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const { userId } = useCurrentUser();
  const photosResult = useQuery(
    api.photos.listByUser,
    userId ? { userId, limit: 200 } : "skip",
  );
  const addPhotos = useMutation(api.albums.addPhotos);

  const allPhotos = photosResult?.photos ?? [];

  // Exclude photos already in album + apply search
  const availablePhotos = useMemo(() => {
    return allPhotos.filter((p: any) => {
      if (existingPhotoIds.has(p._id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (p.fileName ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.locationName ?? "").toLowerCase().includes(q) ||
          (p.aiTags ?? []).some((t: string) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allPhotos, existingPhotoIds, search]);

  const storageKeys = useMemo(
    () => availablePhotos.map((p: any) => p.thumbnailStorageKey || p.storageKey),
    [availablePhotos],
  );
  const photoUrls = usePhotoUrls(storageKeys);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      await addPhotos({
        albumId: albumId as any,
        photoIds: Array.from(selectedIds) as any[],
      });
      setSelectedIds(new Set());
      onClose();
    } catch (err) {
      console.error("Failed to add photos:", err);
    } finally {
      setAdding(false);
    }
  }, [selectedIds, albumId, addPhotos, onClose]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setSearch("");
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-900/15 bg-[#0a0908] shrink-0">
        <button
          onClick={handleClose}
          className="p-1.5 rounded-sm text-amber-800/50 hover:text-amber-600/70 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-heading font-medium text-foreground/90">Add Photos</h2>
          <p className="text-[9px] font-mono text-amber-800/40 uppercase tracking-wider">
            {availablePhotos.length} available · {selectedIds.size} selected
          </p>
        </div>
        <button
          onClick={() => void handleAdd()}
          disabled={selectedIds.size === 0 || adding}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all",
            selectedIds.size > 0 && !adding
              ? "bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 shadow-[0_2px_8px_rgba(201,166,107,0.3)]"
              : "bg-amber-950/30 text-amber-800/30 cursor-not-allowed",
          )}
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          Add {selectedIds.size > 0 ? selectedIds.size : ""} Photo{selectedIds.size !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2.5 border-b border-amber-900/10 bg-[#0a0908] shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-800/35 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, location, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-amber-950/20 border border-amber-900/20 text-sm text-foreground/80 placeholder:text-amber-900/35 outline-none focus:border-amber-700/40 font-mono"
          />
        </div>
      </div>

      {/* Photo grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {photosResult === undefined ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-amber-800/40" />
          </div>
        ) : availablePhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-amber-900/30 gap-3">
            <Images className="h-12 w-12 opacity-30" />
            <p className="text-xs font-mono text-amber-900/40">
              {search ? "No photos match your search" : "All photos are already in this album"}
            </p>
          </div>
        ) : (
          <>
            {/* Select all bar */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  if (selectedIds.size === availablePhotos.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(availablePhotos.map((p: any) => p._id)));
                  }
                }}
                className="text-[10px] font-mono text-amber-700/55 hover:text-amber-500 uppercase tracking-wider transition-colors"
              >
                {selectedIds.size === availablePhotos.length ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {availablePhotos.map((photo: any) => {
                const imageKey = photo.thumbnailStorageKey || photo.storageKey;
                const signedUrl = photoUrls.get(imageKey) ?? null;
                return (
                  <SelectableCell
                    key={photo._id}
                    photo={photo}
                    signedUrl={signedUrl}
                    selected={selectedIds.has(photo._id)}
                    onToggle={() => toggleSelect(photo._id)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
