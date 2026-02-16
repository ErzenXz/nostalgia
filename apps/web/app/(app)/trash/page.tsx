"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";

export default function TrashPage() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);
  const { userId, isLoading: userLoading } = useCurrentUser();

  const trashedPhotos = useQuery(
    api.photos.listTrashed,
    userId ? { userId } : "skip",
  );

  const restorePhoto = useMutation(api.photos.restore);
  const deletePermanently = useMutation(api.photos.deletePermanently);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);

  const isLoading = userLoading || (userId && trashedPhotos === undefined);
  const photos = trashedPhotos ?? [];

  const handleRestore = useCallback(
    (photoId: string) => {
      restorePhoto({ photoId: photoId as any });
    },
    [restorePhoto],
  );

  const handleEmptyTrash = useCallback(async () => {
    if (photos.length === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${photos.length} photo${photos.length > 1 ? "s" : ""}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsEmptying(true);
    try {
      for (const photo of photos) {
        await deletePermanently({ photoId: photo._id as any });
      }
    } catch (err) {
      console.error("Failed to empty trash:", err);
    } finally {
      setIsEmptying(false);
    }
  }, [photos, deletePermanently]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Trash"
        description={`${photos.length} items - permanently deleted after 30 days`}
      >
        <Button
          variant="destructive"
          size="sm"
          disabled={photos.length === 0 || isEmptying}
          onClick={handleEmptyTrash}
        >
          {isEmptying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Empty Trash
        </Button>
      </PageHeader>

      <PhotoGrid
        photos={photos}
        onPhotoClick={(_, index) => setLightboxIndex(index)}
        onFavorite={(id) => toggleFavorite({ photoId: id as any })}
        emptyMessage="Trash is empty"
        emptyIcon={<Trash2 className="h-12 w-12 opacity-50" />}
      />

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onFavorite={(id) => toggleFavorite({ photoId: id as any })}
          onArchive={handleRestore}
          onTrash={(id) => {
            deletePermanently({ photoId: id as any });
            setLightboxIndex(null);
          }}
        />
      )}
    </>
  );
}
