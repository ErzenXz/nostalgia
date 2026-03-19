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
      className="group relative w-full rounded-xl overflow-hidden aspect-[3/4] bg-muted cursor-pointer transition-transform hover:scale-[1.02]"
    >
      {/* Cover image */}
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={memory.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized
        />
      ) : (
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", config.gradient)} />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      {/* Type badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-md px-2 py-1">
        <Icon className="h-3 w-3 text-white" />
        <span className="text-[11px] text-white font-medium">{config.label}</span>
      </div>

      {/* Unseen dot */}
      {!memory.isSeen && (
        <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
      )}

      {/* Play icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20">
          <Play className="h-8 w-8 text-white fill-white ml-1" />
        </div>
      </div>

      {/* Progress Bar (Decorative) */}
      <div className="absolute top-4 left-4 right-16 h-1 bg-white/30 rounded-full overflow-hidden z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="h-full bg-white w-0 group-hover:w-1/3 rounded-full transition-all duration-1000 ease-out" />
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 pointer-events-none text-left">
        <p className="text-[16px] font-semibold text-white leading-tight mb-3 line-clamp-2 drop-shadow-sm">{memory.title}</p>
        
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden shrink-0">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="text-[13px] font-medium text-white/90 drop-shadow-sm truncate">
            {photoCount} photos · {formatDate(memory.date)}
          </span>
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
          <p className="text-[14px] font-semibold text-white">{memory.title}</p>
          <p className="text-[12px] text-white/60">{index + 1} / {photoIds.length}</p>
        </div>
        <button
          onClick={onClose}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
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
          <Loader2 className="h-8 w-8 text-white/50 animate-spin" />
        )}

        {/* Nav arrows */}
        {index > 0 && (
          <button
            onClick={prev}
            className="absolute left-4 h-12 w-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}
        {index < photoIds.length - 1 && (
          <button
            onClick={next}
            className="absolute right-4 h-12 w-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* Caption */}
      {(photo?.captionShort || photo?.description) && (
        <div className="px-6 py-4 bg-black/80 backdrop-blur-sm">
          <p className="text-[14px] text-white/90 text-center leading-relaxed">
            {photo.captionShort || photo.description}
          </p>
          {photo.locationName && (
            <p className="text-[12px] text-white/60 text-center mt-2 flex items-center justify-center gap-1.5 font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {photo.locationName}
            </p>
          )}
        </div>
      )}

      {/* Progress dots */}
      {photoIds.length > 1 && (
        <div className="flex justify-center gap-1.5 py-3 bg-black">
          {photoIds.slice(0, 20).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-white/30",
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mb-4 md:mb-0 rounded-2xl bg-background border border-border shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Film className="h-5 w-5 text-primary" />
            <h3 className="text-[16px] font-semibold text-foreground">Create Movie</h3>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>
        <div className="px-5 py-8 text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Wand2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-[16px] font-semibold text-foreground">AI Movie Generation</p>
            <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
              Automatically create cinematic video slideshows from your memories with AI-generated transitions, music, and captions.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[13px] text-primary font-semibold">Coming Soon</span>
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-[24px] font-serif font-bold text-foreground">Memories</h1>
            <p className="text-[14px] text-muted-foreground mt-1">AI-curated stories from your photo library</p>
          </div>
          <button
            onClick={() => setShowCreateMovie(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-muted text-[13px] text-foreground font-semibold transition-colors border border-border"
          >
            <Film className="h-4 w-4 text-primary" />
            Create Movie
          </button>
        </div>

        {memoryList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border bg-background">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-[18px] font-semibold text-foreground mb-2">No memories yet</p>
            <p className="text-[14px] text-muted-foreground text-center max-w-sm">
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
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-[16px] font-semibold text-foreground">{config.label}</h2>
                  <span className="text-[12px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{group.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
