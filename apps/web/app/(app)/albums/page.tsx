"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { AlbumGrid, SmartAlbumCard } from "@/components/albums/album-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  MapPin,
  Users,
  Sparkles,
  CalendarDays,
  FolderOpen,
} from "lucide-react";

// ─── Smart albums computed from photo data ─────────────────

function useSmartAlbums(photos: any[], people: any[]) {
  return useMemo(() => {
    if (!photos || photos.length === 0) return [];

    // Places: group by locationName
    const locationCounts = new Map<string, number>();
    for (const p of photos) {
      if (p.locationName) {
        locationCounts.set(p.locationName, (locationCounts.get(p.locationName) ?? 0) + 1);
      }
    }
    const topPlace = Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    // Years
    const yearCounts = new Map<number, number>();
    for (const p of photos) {
      const y = p.takenAt
        ? new Date(p.takenAt).getFullYear()
        : new Date(p._creationTime).getFullYear();
      yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
    }
    const topYear = Array.from(yearCounts.entries()).sort((a, b) => b[0] - a[0])[0];

    const smart = [];

    if (people && people.length > 0) {
      smart.push({
        id: "people",
        icon: <Users className="h-10 w-10" />,
        label: "People",
        subtitle: "Faces",
        count: people.reduce((s: number, p: any) => s + (p.photoCount ?? 0), 0) || people.length,
        href: "/albums/people",
        gradient: "bg-gradient-to-br from-blue-950/50 to-[#0a0908]",
      });
    }

    if (topPlace) {
      smart.push({
        id: "places",
        icon: <MapPin className="h-10 w-10" />,
        label: topPlace[0],
        subtitle: "Top Location",
        count: topPlace[1],
        href: "/map",
        gradient: "bg-gradient-to-br from-emerald-950/50 to-[#0a0908]",
      });
    }

    if (topYear) {
      smart.push({
        id: "year",
        icon: <CalendarDays className="h-10 w-10" />,
        label: `${topYear[0]}`,
        subtitle: "Best Year",
        count: topYear[1],
        href: `/photos?year=${topYear[0]}`,
        gradient: "bg-gradient-to-br from-amber-950/60 to-[#0a0908]",
      });
    }

    const favorites = photos.filter((p: any) => p.isFavorite);
    if (favorites.length > 0) {
      smart.push({
        id: "favorites",
        icon: <Sparkles className="h-10 w-10" />,
        label: "Favorites",
        subtitle: "Starred",
        count: favorites.length,
        href: "/favorites",
        gradient: "bg-gradient-to-br from-rose-950/50 to-[#0a0908]",
      });
    }

    return smart;
  }, [photos, people]);
}

// ─── Albums Page ───────────────────────────────────────────

export default function AlbumsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDesc, setNewAlbumDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { userId, isLoading: userLoading } = useCurrentUser();

  const albums = useQuery(api.albums.list, userId ? { userId } : "skip");
  const photosResult = useQuery(
    api.photos.listByUser,
    userId ? { userId, limit: 200 } : "skip",
  );
  const people = useQuery(api.people.list, userId ? { userId } : "skip");

  const createAlbum = useMutation(api.albums.create);

  const isLoading =
    userLoading ||
    (userId !== undefined && (albums === undefined || photosResult === undefined));

  const albumList = albums ?? [];
  const photos = photosResult?.photos ?? [];
  const smartAlbums = useSmartAlbums(photos, people ?? []);

  const handleCreate = useCallback(async () => {
    if (!newAlbumName.trim() || !userId) return;
    setIsCreating(true);
    try {
      await createAlbum({
        userId,
        name: newAlbumName.trim(),
        description: newAlbumDesc.trim() || undefined,
      });
      setNewAlbumName("");
      setNewAlbumDesc("");
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create album:", err);
    } finally {
      setIsCreating(false);
    }
  }, [newAlbumName, newAlbumDesc, userId, createAlbum]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-800/40" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Albums"
        description={`${albumList.length} album${albumList.length !== 1 ? "s" : ""}`}
      >
        <Button
          size="sm"
          className="bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500 shadow-[0_2px_8px_rgba(201,166,107,0.2)] font-mono uppercase tracking-wider text-[10px]"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New Album
        </Button>
      </PageHeader>

      {/* ── Smart Albums Strip ── */}
      {smartAlbums.length > 0 && (
        <div className="px-4 md:px-8 pt-5 pb-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-800/40 mb-3">
            Smart Albums
          </p>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
            {smartAlbums.map((sa) => (
              <SmartAlbumCard
                key={sa.id}
                icon={sa.icon}
                label={sa.label}
                subtitle={sa.subtitle}
                count={sa.count}
                href={sa.href}
                gradient={sa.gradient}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      {smartAlbums.length > 0 && albumList.length > 0 && (
        <div className="flex items-center gap-4 mx-4 md:mx-8 my-1">
          <div className="h-px flex-1 bg-amber-900/10" />
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-900/30 shrink-0">
            Your Albums
          </p>
          <div className="h-px flex-1 bg-amber-900/10" />
        </div>
      )}

      {/* ── Album Grid ── */}
      {albumList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-amber-900/30">
          <FolderOpen className="h-12 w-12 opacity-30 mb-4" />
          <p className="text-sm font-mono text-amber-900/40">
            Create your first album
          </p>
          <Button
            size="sm"
            className="mt-4 bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500 font-mono uppercase tracking-wider text-[10px]"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Album
          </Button>
        </div>
      ) : (
        <AlbumGrid albums={albumList} />
      )}

      {/* ── Create Album Dialog ── */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogContent className="sm:max-w-sm bg-[#0f0e0d] border-amber-900/20">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground/90">
              New Album
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <Input
              placeholder="Album name"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              className="border-amber-900/25 bg-[#0c0b0a] focus:border-amber-700/40 placeholder:text-amber-900/30"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
            />
            <Input
              placeholder="Description (optional)"
              value={newAlbumDesc}
              onChange={(e) => setNewAlbumDesc(e.target.value)}
              className="border-amber-900/25 bg-[#0c0b0a] focus:border-amber-700/40 placeholder:text-amber-900/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-900/25 text-amber-800/50 font-mono uppercase tracking-wider text-[10px]"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newAlbumName.trim() || isCreating}
              className="bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500 font-mono uppercase tracking-wider text-[10px]"
              onClick={() => void handleCreate()}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
