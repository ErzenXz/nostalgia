"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";

export default function ArchivePage() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { userId, isLoading: userLoading } = useCurrentUser();

  const archivedPhotos = useQuery(
    api.photos.listArchived,
    userId ? { userId } : "skip",
  );

  const unarchivePhoto = useMutation(api.photos.unarchive);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const trashPhoto = useMutation(api.photos.trash);

  const isLoading = userLoading || (userId && archivedPhotos === undefined);
  const photos = archivedPhotos ?? [];

  const handleUnarchive = useCallback(
    (photoId: string) => {
      unarchivePhoto({ photoId: photoId as any });
    },
    [unarchivePhoto],
  );

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
        title="Archive"
        description={`${photos.length} archived photos - hidden from your main library`}
      />

      <PhotoGrid
        photos={photos}
        onPhotoClick={(_, index) => setLightboxIndex(index)}
        onFavorite={(id) => toggleFavorite({ photoId: id as any })}
        emptyMessage="No archived photos"
        emptyIcon={<Archive className="h-12 w-12 opacity-50" />}
      />

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onFavorite={(id) => toggleFavorite({ photoId: id as any })}
          onArchive={handleUnarchive}
          onTrash={(id) => {
            trashPhoto({ photoId: id as any });
            setLightboxIndex(null);
          }}
        />
      )}
    </>
  );
}
