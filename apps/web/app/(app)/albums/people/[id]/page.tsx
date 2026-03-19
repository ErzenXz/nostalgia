"use client";

import { useState, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { ArrowLeft, Users, Loader2, Edit2, Check, Images } from "lucide-react";

// ─── Hero avatar (cover photo) ────────────────────────────

const HeroAvatar = memo(function HeroAvatar({ photo }: { photo: any | null }) {
  const imageKey = photo ? (photo.thumbnailStorageKey || photo.storageKey) : null;
  const signedUrl = usePhotoUrl(imageKey ?? "");
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey ?? "",
    signedUrl,
    mimeType: photo?.thumbnailStorageKey ? "image/jpeg" : (photo?.mimeType ?? "image/jpeg"),
    enabled: !!photo?.isEncrypted,
  });
  const url = photo?.isEncrypted ? decryptedUrl : signedUrl;

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Users className="h-10 w-10 text-muted-foreground opacity-50" />
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt=""
      fill
      className="object-cover"
      sizes="128px"
      unoptimized
      priority
    />
  );
});

// ─── Person Detail Page ───────────────────────────────────

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.id as string;

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { userId } = useCurrentUser();
  const person = useQuery(
    api.people.list,
    userId ? { userId } : "skip",
  );
  const currentPerson = person?.find((p: any) => p._id === personId) ?? null;

  const photos = useQuery(api.people.getPhotosByPerson, {
    personId: personId as any,
  });

  const coverPhoto = useQuery(
    api.photos.getById,
    currentPerson?.coverPhotoId ? { photoId: currentPerson.coverPhotoId } : "skip",
  );

  const rename = useMutation(api.people.rename);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const trashPhoto = useMutation(api.photos.trash);

  const isLoading = person === undefined || photos === undefined;
  const photoList = (photos ?? []).filter(Boolean) as any[];
  const label = currentPerson?.name || `Person ${personId.slice(-4)}`;

  const handleRename = async () => {
    if (nameInput.trim()) {
      await rename({ personId: personId as any, name: nameInput.trim() });
    }
    setEditing(false);
  };

  const startEdit = () => {
    setNameInput(currentPerson?.name ?? "");
    setEditing(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Cinematic person header ── */}
      <div className="relative bg-background border-b border-border">
        {/* Blurred background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 scale-110">
            <HeroAvatar photo={coverPhoto ?? null} />
          </div>
          <div className="absolute inset-0 backdrop-blur-3xl bg-background/80" />
        </div>

        <div className="relative z-10 max-w-[1600px] mx-auto">
          {/* Back button */}
          <div className="px-4 md:px-8 pt-6">
            <Link href="/albums/people">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary/80 backdrop-blur-md border border-border text-[13px] font-medium text-foreground hover:bg-secondary transition-colors shadow-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to People
              </button>
            </Link>
          </div>

          {/* Person info */}
          <div className="flex items-center gap-6 px-4 md:px-8 py-8 pb-10">
            {/* Circular avatar */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden border border-border shrink-0 shadow-sm">
              <HeroAvatar photo={coverPhoto ?? null} />
            </div>

            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    autoFocus
                    className="bg-transparent border-b-2 border-primary text-2xl font-semibold text-foreground outline-none min-w-[200px] pb-1"
                  />
                  <button
                    onClick={() => void handleRename()}
                    className="text-primary hover:text-primary/80 transition-colors bg-primary/10 p-1.5 rounded-full"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">
                    {label}
                  </h1>
                  <button
                    onClick={startEdit}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all bg-secondary p-1.5 rounded-full"
                    title="Rename"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <p className="mt-2 text-[14px] font-medium text-muted-foreground">
                {photoList.length} photo{photoList.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Photo grid ── */}
      <div className="max-w-[1600px] mx-auto py-6">
        {photoList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border border-dashed border-border mx-4 md:mx-8 rounded-2xl bg-muted/20">
            <Images className="h-12 w-12 opacity-50 mb-4" />
            <p className="text-[15px] font-medium text-foreground">No photos found for this person</p>
          </div>
        ) : (
          <PhotoGrid
            photos={photoList}
            onPhotoClick={(_, index) => setLightboxIndex(index)}
            onFavorite={(id) => toggleFavorite({ photoId: id as any })}
            emptyMessage="No photos found"
            emptyIcon={<Images className="h-12 w-12 opacity-50" />}
            stickyHeaders
          />
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photoList}
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
    </div>
  );
}
