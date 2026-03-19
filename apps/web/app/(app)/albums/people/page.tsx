"use client";

import { useState, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Users, Loader2, Edit2, Check } from "lucide-react";

// ─── Person cover photo ───────────────────────────────────

const PersonCover = memo(function PersonCover({
  photo,
}: {
  photo: { storageKey: string; thumbnailStorageKey?: string; isEncrypted?: boolean; mimeType?: string } | null;
}) {
  const imageKey = photo ? (photo.thumbnailStorageKey || photo.storageKey) : null;
  const signedUrl = usePhotoUrl(imageKey ?? "");
  const isThumb = photo ? (!!photo.thumbnailStorageKey && imageKey === photo.thumbnailStorageKey) : false;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey ?? "",
    signedUrl,
    mimeType: isThumb ? "image/jpeg" : (photo?.mimeType ?? "image/jpeg"),
    enabled: !!photo?.isEncrypted,
  });
  const url = photo?.isEncrypted ? decryptedUrl : signedUrl;

  if (!photo || !url) {
    return (
      <div className="absolute inset-0 bg-muted flex items-center justify-center">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt=""
      fill
      className="object-cover"
      sizes="160px"
      unoptimized
    />
  );
});

// ─── Person Card ──────────────────────────────────────────

function PersonCard({ person }: { person: any }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name ?? "");
  const rename = useMutation(api.people.rename);

  const coverPhoto = useQuery(
    api.photos.getById,
    person.coverPhotoId ? { photoId: person.coverPhotoId } : "skip",
  );

  const handleRename = async () => {
    if (name.trim()) {
      await rename({ personId: person._id, name: name.trim() });
    }
    setEditing(false);
  };

  const label = person.name || `Person ${person._id.slice(-4)}`;

  return (
    <div className="group flex flex-col items-center gap-3">
      {/* Circular avatar */}
      <Link href={`/albums/people/${person._id}`} className="relative block">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300">
          <PersonCover photo={coverPhoto ?? null} />
        </div>
        {person.photoCount > 0 && (
          <div className="absolute bottom-0 right-0 min-w-[24px] h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center px-1.5 shadow-sm">
            <span className="text-[11px] font-semibold text-primary-foreground">
              {person.photoCount}
            </span>
          </div>
        )}
      </Link>

      {/* Name / edit */}
      {editing ? (
        <div className="flex items-center gap-1 w-full max-w-[120px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleRename();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            className="flex-1 min-w-0 text-[13px] font-medium text-center bg-transparent border-b border-primary text-foreground outline-none"
          />
          <button onClick={() => void handleRename()} className="text-primary hover:text-primary/80">
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 group/name">
          <p className="text-[13px] font-medium text-foreground text-center max-w-[110px] truncate">
            {label}
          </p>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover/name:opacity-100 text-muted-foreground hover:text-foreground transition-all"
          >
            <Edit2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── People Page ──────────────────────────────────────────

export default function PeoplePage() {
  const { userId, isLoading: userLoading } = useCurrentUser();
  const people = useQuery(api.people.list, userId ? { userId } : "skip");

  const isLoading = userLoading || (userId !== undefined && people === undefined);

  return (
    <>
      <PageHeader title="People" description="Faces in your photos">
        <Link href="/albums">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Albums
          </button>
        </Link>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !people || people.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <Users className="h-12 w-12 opacity-30 mb-4" />
          <p className="text-[15px] font-medium text-foreground">
            No faces detected yet
          </p>
          <p className="text-[13px] mt-1 text-center max-w-sm">
            Enable AI processing in Settings to detect and group faces in your photos
          </p>
        </div>
      ) : (
        <div className="px-4 md:px-8 py-8">
          <div className="grid grid-cols-2 gap-y-10 gap-x-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {people.map((person: any) => (
              <PersonCard key={person._id} person={person} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
