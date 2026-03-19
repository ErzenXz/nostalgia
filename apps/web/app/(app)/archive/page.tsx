"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { Archive, Loader2 } from "lucide-react";

export default function ArchivePage() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { userId, isLoading: userLoading } = useCurrentUser();

  const photos = useQuery(
    api.photos.listArchived,
    userId ? { userId } : "skip",
  );

  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const unarchivePhoto = useMutation(api.photos.unarchive);
  const trashPhoto = useMutation(api.photos.trash);

  const isLoading = userLoading || (userId && photos === undefined);
  const archivedPhotos = photos ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-0 py-6 md:px-6">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <div className="px-4 md:px-8">
          <PageHeader
            title="Archive"
            description={`${archivedPhotos.length} archived photos`}
          />
        </div>

        <PhotoGrid
          photos={archivedPhotos}
          onPhotoClick={(_, index) => setLightboxIndex(index)}
          onFavorite={(id) => toggleFavorite({ photoId: id as any })}
          emptyMessage="No archived photos"
          emptyIcon={<Archive className="h-12 w-12 opacity-50" />}
        />

        {lightboxIndex !== null && (
          <Lightbox
            photos={archivedPhotos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
            onFavorite={(id) => toggleFavorite({ photoId: id as any })}
            onArchive={(id) => {
              unarchivePhoto({ photoId: id as any });
              setLightboxIndex(null);
            }}
            onTrash={(id) => {
              trashPhoto({ photoId: id as any });
              setLightboxIndex(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
