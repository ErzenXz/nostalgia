"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import {
  X,
  FolderOpen,
  Check,
  Loader2,
  Plus,
  Images,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface AddToAlbumSheetProps {
  photoIds: string[];
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}

export function AddToAlbumSheet({
  photoIds,
  open,
  onClose,
  onDone,
}: AddToAlbumSheetProps) {
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const { userId } = useCurrentUser();
  const albums = useQuery(api.albums.list, userId ? { userId } : "skip");
  const addPhotosMutation = useMutation(api.albums.addPhotos);
  const createAlbum = useMutation(api.albums.create);

  const albumList = albums ?? [];

  const handleAddTo = useCallback(
    async (albumId: string) => {
      if (addingTo || photoIds.length === 0) return;
      setAddingTo(albumId);
      try {
        await addPhotosMutation({
          albumId: albumId as any,
          photoIds: photoIds as any[],
        });
        setJustAdded(albumId);
        setTimeout(() => {
          setJustAdded(null);
          onDone?.();
          onClose();
        }, 800);
      } catch (err) {
        console.error("Failed to add photos:", err);
      } finally {
        setAddingTo(null);
      }
    },
    [addingTo, photoIds, addPhotosMutation, onDone, onClose],
  );

  const handleCreateAndAdd = useCallback(async () => {
    if (!newAlbumName.trim() || !userId) return;
    setIsCreating(true);
    try {
      const albumId = await createAlbum({ userId, name: newAlbumName.trim() });
      await addPhotosMutation({
        albumId: albumId as any,
        photoIds: photoIds as any[],
      });
      setNewAlbumName("");
      setCreatingNew(false);
      onDone?.();
      onClose();
    } catch (err) {
      console.error("Failed to create album and add:", err);
    } finally {
      setIsCreating(false);
    }
  }, [newAlbumName, userId, createAlbum, addPhotosMutation, photoIds, onDone, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl border-t border-amber-900/20 bg-[#0f0e0d] shadow-[0_-8px_40px_rgba(0,0,0,0.7)] max-h-[70vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-amber-900/25" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/12 shrink-0">
          <div>
            <h2 className="text-sm font-heading font-medium text-foreground/90">Add to Album</h2>
            <p className="text-[9px] font-mono text-amber-800/45 uppercase tracking-wider mt-0.5">
              {photoIds.length} photo{photoIds.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-amber-800/50 hover:text-amber-600/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Album list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {/* Create new */}
          {creatingNew ? (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-700/30 bg-amber-950/20">
              <Input
                autoFocus
                placeholder="New album name…"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                className="flex-1 border-amber-900/25 bg-transparent text-sm focus:border-amber-700/40 placeholder:text-amber-900/35"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateAndAdd();
                  if (e.key === "Escape") setCreatingNew(false);
                }}
              />
              <button
                onClick={() => void handleCreateAndAdd()}
                disabled={!newAlbumName.trim() || isCreating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 text-[10px] font-mono uppercase tracking-wider disabled:opacity-40 shrink-0"
              >
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create & Add"}
              </button>
              <button
                onClick={() => setCreatingNew(false)}
                className="p-1.5 text-amber-800/40 hover:text-amber-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-amber-900/25 text-amber-800/45 hover:border-amber-700/40 hover:text-amber-600/70 transition-colors"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-mono uppercase tracking-wider">New Album</span>
            </button>
          )}

          {/* Existing albums */}
          {albums === undefined ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-amber-800/40" />
            </div>
          ) : albumList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-amber-900/30 gap-2">
              <Images className="h-8 w-8 opacity-30" />
              <p className="text-[11px] font-mono text-amber-900/40">No albums yet</p>
            </div>
          ) : (
            albumList.map((album: any) => {
              const isAdding = addingTo === album._id;
              const isDone = justAdded === album._id;
              return (
                <button
                  key={album._id}
                  onClick={() => void handleAddTo(album._id)}
                  disabled={!!addingTo}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left",
                    isDone
                      ? "border-amber-600/40 bg-amber-950/30"
                      : "border-amber-900/15 hover:border-amber-800/30 hover:bg-amber-950/15",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/35 border border-amber-900/20 shrink-0">
                    {isDone ? (
                      <Check className="h-4 w-4 text-amber-400/80" />
                    ) : isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-600/70" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-amber-700/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading font-medium text-foreground/85 truncate">{album.name}</p>
                    <p className="text-[9px] font-mono text-amber-800/40 mt-0.5 uppercase tracking-wider">
                      {album.photoCount} photos
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Safe area */}
        <div className="h-safe-bottom shrink-0" />
      </div>
    </>
  );
}
