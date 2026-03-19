"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { Trash2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TrashPage() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);
  const { userId, isLoading: userLoading } = useCurrentUser();

  const photos = useQuery(
    api.photos.listTrashed,
    userId ? { userId } : "skip",
  );

  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const restorePhoto = useMutation(api.photos.restore);
  const deletePermanently = useMutation(api.photos.deletePermanently);

  const isLoading = userLoading || (userId && photos === undefined);
  const trashedPhotos = photos ?? [];

  const handleEmptyTrash = async () => {
    if (trashedPhotos.length === 0) return;
    setIsEmptying(true);
    try {
      await Promise.all(
        trashedPhotos.map((p: any) =>
          deletePermanently({ photoId: p._id as any }),
        ),
      );
    } finally {
      setIsEmptying(false);
    }
  };

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
            title="Trash"
            description={`${trashedPhotos.length} items · Auto-deletes after 30 days`}
          >
            {trashedPhotos.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full px-4 text-[13px] font-medium"
                onClick={() => void handleEmptyTrash()}
                disabled={isEmptying}
              >
                {isEmptying ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Empty Trash
              </Button>
            )}
          </PageHeader>
        </div>

        <PhotoGrid
          photos={trashedPhotos}
          onPhotoClick={(_, index) => setLightboxIndex(index)}
          onFavorite={(id) => toggleFavorite({ photoId: id as any })}
          emptyMessage="Trash is empty"
          emptyIcon={<Trash2 className="h-12 w-12 opacity-50" />}
        />

        {lightboxIndex !== null && (
          <Lightbox
            photos={trashedPhotos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
            onFavorite={(id: string) => toggleFavorite({ photoId: id as any })}
            onRestore={(id: string) => {
              restorePhoto({ photoId: id as any });
              setLightboxIndex(null);
            }}
            onTrash={(id: string) => {
              deletePermanently({ photoId: id as any });
              setLightboxIndex(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
