"use client";

import { useState, useCallback, useRef } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAiOptIn } from "@/hooks/use-ai-opt-in";
import { PageHeader } from "@/components/layout/page-header";
import { SearchBar } from "@/components/search/search-bar";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { cn } from "@/lib/utils";
import {
  Search as SearchIcon,
  Sparkles,
  TrendingUp,
  Loader2,
  Tag,
  X,
  Settings,
  SearchX,
} from "lucide-react";
import Link from "next/link";

const categories = [
  { name: "People", emoji: "👤" },
  { name: "Places", emoji: "📍" },
  { name: "Food", emoji: "🍕" },
  { name: "Animals", emoji: "🐾" },
  { name: "Nature", emoji: "🌿" },
  { name: "Architecture", emoji: "🏛️" },
  { name: "Events", emoji: "🎉" },
  { name: "Screenshots", emoji: "📱" },
  { name: "Documents", emoji: "📄" },
  { name: "Art", emoji: "🎨" },
  { name: "Sports", emoji: "⚽" },
  { name: "Travel", emoji: "✈️" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { userId, isLoading: userLoading } = useCurrentUser();
  const { aiOptIn } = useAiOptIn();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const semanticSearch = useAction(api.ai.search.semanticSearch);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);
  const trashPhoto = useMutation(api.photos.trash);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setActiveTags(new Set());
        setHasSearched(false);
        return;
      }
      setIsSearching(true);
      try {
        const res = await semanticSearch({ query: q.trim(), limit: 30 });
        setResults(res ?? []);
        setHasSearched(true);
      } catch {
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    },
    [semanticSearch],
  );

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (!q.trim()) {
        setResults([]);
        setActiveTags(new Set());
        setHasSearched(false);
        return;
      }
      searchTimeoutRef.current = setTimeout(() => doSearch(q), 400);
    },
    [doSearch],
  );

  // Collect all unique tags from results
  const allTags = Array.from(
    new Set(results.flatMap((r: any) => r.photo?.aiTagsV2 ?? [])),
  ).slice(0, 20);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  // Filter results by active tags
  const filteredResults = activeTags.size > 0
    ? results.filter((r: any) => {
        const tags: string[] = r.photo?.aiTagsV2 ?? [];
        return Array.from(activeTags).some((t) => tags.includes(t));
      })
    : results;

  const photos = filteredResults
    .map((r: any) => r.photo)
    .filter(Boolean);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Search" description="Find any photo with AI" />

      <div className="p-8 space-y-6">
        <SearchBar onSearch={handleSearch} className="max-w-2xl" />

        {!query ? (
          <div className="space-y-8">
            {/* Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Explore
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-foreground hover:bg-accent hover:border-muted-foreground/20 transition-all duration-150"
                    onClick={() => handleSearch(cat.name)}
                  >
                    <span className="text-base">{cat.emoji}</span>
                    <span className="text-xs font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Features banner */}
            <div
              className={cn(
                "rounded-xl border p-5",
                aiOptIn
                  ? "border-purple-500/20 bg-gradient-to-r from-purple-500/[0.06] to-blue-500/[0.04]"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className={cn("h-4.5 w-4.5", aiOptIn ? "text-purple-400" : "text-muted-foreground")} />
                    <h3 className="text-sm font-semibold text-foreground">
                      AI-Powered Search
                    </h3>
                    {aiOptIn && (
                      <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                    Search naturally — try &quot;photos of my dog at the
                    beach&quot; or &quot;birthday party last summer&quot;. AI
                    understands context, objects, scenes, and emotions.
                  </p>
                </div>
                {!aiOptIn && (
                  <Link
                    href="/settings"
                    className="shrink-0 ml-4 flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Settings className="h-3 w-3" />
                    Enable
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-muted-foreground">
                  {isSearching
                    ? "Searching..."
                    : hasSearched
                      ? `${photos.length} result${photos.length !== 1 ? "s" : ""} for`
                      : "Results for"}{" "}
                  &quot;{query}&quot;
                </span>
                {isSearching && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              {activeTags.size > 0 && (
                <button
                  onClick={() => setActiveTags(new Set())}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Tag chips for filtering */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <div className="flex items-center gap-1 mr-1">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    Filter:
                  </span>
                </div>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-all duration-150",
                      activeTags.has(tag)
                        ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                        : "bg-secondary border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {tag}
                    {activeTags.has(tag) && (
                      <X className="h-2.5 w-2.5" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results state */}
            {hasSearched && !isSearching && photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
                  <SearchX className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  No results found
                </p>
                <p className="text-xs text-muted-foreground max-w-sm text-center">
                  {aiOptIn
                    ? "Try different words or check your spelling. AI search works best with descriptive phrases."
                    : "Enable AI Intelligence in Settings to unlock semantic photo search."}
                </p>
              </div>
            ) : (
              <PhotoGrid
                photos={photos}
                onPhotoClick={(_, index) => setLightboxIndex(index)}
                onFavorite={(id) => toggleFavorite({ photoId: id as any })}
                emptyMessage={isSearching ? "Searching..." : "No results"}
                emptyIcon={<SearchIcon className="h-12 w-12 opacity-50" />}
              />
            )}

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
          </div>
        )}
      </div>
    </>
  );
}
