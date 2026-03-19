"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { Heart, Loader2 } from "lucide-react";

export default function FavoritesPage() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { userId, isLoading: userLoading } = useCurrentUser();

  const photos = useQuery(
    api.photos.listFavorites,
    userId ? { userId } : "skip",
  );

  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const archivePhoto = useMutation(api.photos.archive);
  const trashPhoto = useMutation(api.photos.trash);

  const isLoading = userLoading || (userId && photos === undefined);
  const favoritePhotos = photos ?? [];

  const handleFavorite = useCallback(
    (photoId: string) => {
      toggleFavorite({ photoId: photoId as any });
    },
    [toggleFavorite],
  );

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
            title="Favorites"
            description={`${favoritePhotos.length} favorites`}
          />
        </div>

        <PhotoGrid
          photos={favoritePhotos}
          onPhotoClick={(_, index) => setLightboxIndex(index)}
          onFavorite={handleFavorite}
          emptyMessage="No favorite photos yet"
          emptyIcon={<Heart className="h-12 w-12 opacity-50" />}
        />

        {lightboxIndex !== null && (
          <Lightbox
            photos={favoritePhotos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
            onFavorite={handleFavorite}
            onArchive={(id) => archivePhoto({ photoId: id as any })}
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
