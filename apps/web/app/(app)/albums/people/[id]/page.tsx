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
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-950/40 to-[#0a0908]">
        <Users className="h-10 w-10 text-amber-800/30" />
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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-800/40" />
      </div>
    );
  }

  return (
    <>
      {/* ── Cinematic person header ── */}
      <div className="relative bg-[#0a0908] border-b border-amber-900/12">
        {/* Blurred background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 scale-110">
            <HeroAvatar photo={coverPhoto ?? null} />
          </div>
          <div className="absolute inset-0 backdrop-blur-2xl bg-[#0a0908]/70" />
        </div>

        {/* Back button */}
        <div className="relative z-10 px-4 md:px-8 pt-4">
          <Link href="/albums/people">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-white/60 hover:text-white/90 transition-colors uppercase tracking-wider">
              <ArrowLeft className="h-3.5 w-3.5" />
              People
            </button>
          </Link>
        </div>

        {/* Person info */}
        <div className="relative z-10 flex items-center gap-5 px-4 md:px-8 py-6 pb-8">
          {/* Circular avatar */}
          <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-amber-600/30 shrink-0">
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
                  className="bg-transparent border-b-2 border-amber-500/60 text-xl font-heading text-foreground/90 outline-none min-w-[150px]"
                />
                <button
                  onClick={() => void handleRename()}
                  className="text-amber-500/80 hover:text-amber-400"
                >
                  <Check className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-xl font-heading font-semibold text-foreground/95">
                  {label}
                </h1>
                <button
                  onClick={startEdit}
                  className="opacity-0 group-hover:opacity-100 text-amber-800/40 hover:text-amber-600/70 transition-all"
                  title="Rename"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <p className="mt-1 text-[10px] font-mono text-amber-800/50 uppercase tracking-wider">
              {photoList.length} photo{photoList.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ── Photo grid ── */}
      {photoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-amber-900/30">
          <Images className="h-12 w-12 opacity-30 mb-4" />
          <p className="text-xs font-mono text-amber-900/40">No photos found for this person</p>
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
    </>
  );
}
