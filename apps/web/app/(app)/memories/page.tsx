"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import {
  Sparkles,
  Calendar,
  Users,
  MapPin,
  Clock,
  Film,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Loader2,
  Wand2,
} from "lucide-react";

// ── Type config ──────────────────────────────────────────────

const typeConfig: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
  on_this_day: { label: "On This Day", icon: Calendar, gradient: "from-orange-500/20 to-amber-500/20" },
  trip: { label: "Trip", icon: MapPin, gradient: "from-blue-500/20 to-cyan-500/20" },
  people: { label: "People", icon: Users, gradient: "from-pink-500/20 to-rose-500/20" },
  theme: { label: "Theme", icon: Sparkles, gradient: "from-purple-500/20 to-violet-500/20" },
  year_review: { label: "Year Review", icon: Clock, gradient: "from-emerald-500/20 to-green-500/20" },
};

// ── Memory Card ──────────────────────────────────────────────

function MemoryCard({
  memory,
  onOpen,
}: {
  memory: any;
  onOpen: (memory: any) => void;
}) {
  const firstPhotoId = memory.photoIds?.[0];
  // We can't use hooks conditionally; use the ID or empty string
  const coverPhoto = useQuery(
    api.photos.getById,
    firstPhotoId ? { photoId: firstPhotoId } : "skip",
  );

  const imageKey = coverPhoto?.thumbnailStorageKey || coverPhoto?.storageKey || "";
  const signedUrl = usePhotoUrl(imageKey);
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: coverPhoto?.thumbnailStorageKey ? "image/jpeg" : (coverPhoto?.mimeType ?? "image/jpeg"),
    enabled: !!coverPhoto?.isEncrypted,
  });
  const coverUrl = coverPhoto?.isEncrypted ? decryptedUrl : signedUrl;

  const config = typeConfig[memory.type] ?? typeConfig.theme!;
  const Icon = config.icon;
  const photoCount = memory.photoIds?.length ?? 0;

  return (
    <button
      onClick={() => onOpen(memory)}
      className="group relative w-full rounded-2xl overflow-hidden aspect-[9/14] bg-[#1f1f1f] cursor-pointer hover:scale-[1.02] transition-transform duration-300"
    >
      {/* Cover image */}
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={memory.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized
        />
      ) : (
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", config.gradient)} />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

      {/* Type badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
        <Icon className="h-3 w-3 text-[#c9a66b]" />
        <span className="text-[10px] text-white/90 font-medium">{config.label}</span>
      </div>

      {/* Unseen dot */}
      {!memory.isSeen && (
        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[#c9a66b]" />
      )}

      {/* Play icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="h-12 w-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 inset-x-0 p-3 space-y-1">
        <p className="text-[13px] font-semibold text-white line-clamp-2 leading-snug">{memory.title}</p>
        {memory.description && (
          <p className="text-[11px] text-white/70 line-clamp-2">{memory.description}</p>
        )}
        <div className="flex items-center gap-2 text-[10px] text-white/50 pt-0.5">
          <span>{photoCount} photos</span>
          <span>·</span>
          <span>{formatDate(memory.date)}</span>
        </div>
      </div>
    </button>
  );
}

// ── Slideshow Player ─────────────────────────────────────────

function SlideshowPlayer({ memory, onClose }: { memory: any; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const photoIds: string[] = memory.photoIds ?? [];
  const currentId = photoIds[index];

  const photo = useQuery(api.photos.getById, currentId ? { photoId: currentId as any } : "skip");

  const imageKey = photo?.thumbnailStorageKey || photo?.storageKey || "";
  const signedUrl = usePhotoUrl(imageKey);
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: photo?.thumbnailStorageKey ? "image/jpeg" : (photo?.mimeType ?? "image/jpeg"),
    enabled: !!photo?.isEncrypted,
  });
  const url = photo?.isEncrypted ? decryptedUrl : signedUrl;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(photoIds.length - 1, i + 1));

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <div>
          <p className="text-[13px] font-semibold text-white">{memory.title}</p>
          <p className="text-[11px] text-[#aaa]">{index + 1} / {photoIds.length}</p>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 relative flex items-center justify-center">
        {url ? (
          <Image
            src={url}
            alt={photo?.description || photo?.fileName || "Memory"}
            fill
            className="object-contain"
            sizes="100vw"
            unoptimized
          />
        ) : (
          <Loader2 className="h-8 w-8 text-[#aaa] animate-spin" />
        )}

        {/* Nav arrows */}
        {index > 0 && (
          <button
            onClick={prev}
            className="absolute left-4 h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}
        {index < photoIds.length - 1 && (
          <button
            onClick={next}
            className="absolute right-4 h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Caption */}
      {(photo?.captionShort || photo?.description) && (
        <div className="px-6 py-3 bg-black/80 backdrop-blur-sm">
          <p className="text-[13px] text-white/90 text-center leading-relaxed">
            {photo.captionShort || photo.description}
          </p>
          {photo.locationName && (
            <p className="text-[11px] text-[#aaa] text-center mt-1 flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {photo.locationName}
            </p>
          )}
        </div>
      )}

      {/* Progress dots */}
      {photoIds.length > 1 && (
        <div className="flex justify-center gap-1 py-2 bg-black">
          {photoIds.slice(0, 20).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === index ? "w-4 bg-[#c9a66b]" : "w-1 bg-white/20",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create Movie Sheet (stub) ─────────────────────────────────

function CreateMovieSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mb-4 md:mb-0 rounded-2xl bg-[#1f1f1f] border border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-[#c9a66b]" />
            <h3 className="text-[14px] font-semibold text-white">Create Movie</h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] transition-colors">
            <X className="h-4 w-4 text-[#aaa]" />
          </button>
        </div>
        <div className="px-5 py-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-[#272727] flex items-center justify-center">
            <Wand2 className="h-7 w-7 text-[#c9a66b]" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-white">AI Movie Generation</p>
            <p className="text-[12px] text-[#aaa] mt-1.5 leading-relaxed">
              Automatically create cinematic video slideshows from your memories with AI-generated transitions, music, and captions.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c9a66b]/10 border border-[#c9a66b]/20">
            <Sparkles className="h-3 w-3 text-[#c9a66b]" />
            <span className="text-[11px] text-[#c9a66b] font-medium">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

const typeOrder = ["on_this_day", "trip", "people", "theme", "year_review"];

export default function MemoriesPage() {
  const { userId, isLoading: userLoading } = useCurrentUser();
  const memories = useQuery(api.memories.listByUser, userId ? { userId } : "skip");
  const markSeen = useMutation(api.memories.markSeen);

  const [activeMemory, setActiveMemory] = useState<any>(null);
  const [showCreateMovie, setShowCreateMovie] = useState(false);

  const isLoading = userLoading || (userId && memories === undefined);
  const memoryList = memories ?? [];

  const handleOpen = (memory: any) => {
    if (!memory.isSeen) markSeen({ memoryId: memory._id as any });
    setActiveMemory(memory);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-[#aaa]" />
      </div>
    );
  }

  // Group by type
  const byType: Record<string, any[]> = {};
  for (const m of memoryList) {
    if (!byType[m.type]) byType[m.type] = [];
    byType[m.type]!.push(m);
  }

  return (
    <>
      {/* Slideshow overlay */}
      {activeMemory && (
        <SlideshowPlayer memory={activeMemory} onClose={() => setActiveMemory(null)} />
      )}

      {/* Create movie overlay */}
      {showCreateMovie && <CreateMovieSheet onClose={() => setShowCreateMovie(false)} />}

      <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[#f1f1f1]">Memories</h1>
            <p className="text-[13px] text-[#aaa] mt-0.5">AI-curated stories from your photo library</p>
          </div>
          <button
            onClick={() => setShowCreateMovie(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#272727] hover:bg-[#3f3f3f] text-[13px] text-[#f1f1f1] font-medium transition-colors border border-white/[0.06]"
          >
            <Film className="h-4 w-4 text-[#c9a66b]" />
            Create Movie
          </button>
        </div>

        {memoryList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Sparkles className="h-10 w-10 text-[#717171] mb-4" />
            <p className="text-[#f1f1f1] font-medium mb-1">No memories yet</p>
            <p className="text-[13px] text-[#aaa] text-center max-w-sm">
              Upload more photos and memories will be auto-generated as your library grows
            </p>
          </div>
        ) : (
          typeOrder.map((type) => {
            const group = byType[type];
            if (!group || group.length === 0) return null;
            const config = typeConfig[type] ?? typeConfig.theme!;
            const Icon = config.icon;
            return (
              <section key={type} className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-[#c9a66b]" />
                  <h2 className="text-[15px] font-semibold text-[#f1f1f1]">{config.label}</h2>
                  <span className="text-[12px] text-[#717171]">{group.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {group.map((memory) => (
                    <MemoryCard key={memory._id} memory={memory} onOpen={handleOpen} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
