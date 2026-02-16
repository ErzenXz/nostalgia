"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { AlbumGrid } from "@/components/albums/album-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";

export default function AlbumsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { userId, isLoading: userLoading } = useCurrentUser();

  const albums = useQuery(api.albums.list, userId ? { userId } : "skip");

  const createAlbum = useMutation(api.albums.create);

  const isLoading = userLoading || (userId && albums === undefined);
  const albumList = albums ?? [];

  const handleCreate = useCallback(async () => {
    if (!newAlbumName.trim() || !userId) return;
    setIsCreating(true);
    try {
      await createAlbum({
        userId,
        name: newAlbumName.trim(),
      });
      setNewAlbumName("");
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create album:", err);
    } finally {
      setIsCreating(false);
    }
  }, [newAlbumName, userId, createAlbum]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Albums" description={`${albumList.length} albums`}>
        <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Album
        </Button>
      </PageHeader>

      <AlbumGrid albums={albumList} />

      {/* Create Album Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Album</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Album name"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newAlbumName.trim() || isCreating}
              onClick={handleCreate}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
