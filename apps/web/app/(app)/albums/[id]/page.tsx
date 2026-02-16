"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Trash2, Images, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const album = useQuery(api.albums.getById, { albumId: albumId as any });
  const albumPhotos = useQuery(api.albums.getPhotos, {
    albumId: albumId as any,
  });

  const shareAlbum = useMutation(api.albums.shareAlbum);
  const deleteAlbum = useMutation(api.albums.deleteAlbum);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const trashPhoto = useMutation(api.photos.trash);

  const isLoading = album === undefined || albumPhotos === undefined;
  const photos = (albumPhotos ?? []).filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  const handleShare = useCallback(async () => {
    if (!albumId) return;
    try {
      const token = await shareAlbum({ albumId: albumId as any });
      const url = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error("Failed to share album:", err);
    }
  }, [albumId, shareAlbum]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!album) {
    return (
      <>
        <PageHeader
          title="Album Not Found"
          description="This album doesn't exist"
        >
          <Link href="/albums">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </PageHeader>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={album.name}
        description={`${photos.length} photos${album.description ? ` - ${album.description}` : ""}`}
      >
        <Link href="/albums">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </PageHeader>

      <PhotoGrid
        photos={photos}
        onPhotoClick={(_, index) => setLightboxIndex(index)}
        onFavorite={(id) => toggleFavorite({ photoId: id as any })}
        emptyMessage="No photos in this album yet"
        emptyIcon={<Images className="h-12 w-12 opacity-50" />}
      />

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onFavorite={(id) => toggleFavorite({ photoId: id as any })}
          onTrash={(id) => {
            trashPhoto({ photoId: id as any });
            setLightboxIndex(null);
          }}
        />
      )}
    </>
  );
}
