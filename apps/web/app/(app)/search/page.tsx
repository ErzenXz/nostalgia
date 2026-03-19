"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useRef } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAiOptIn } from "@/hooks/use-ai-opt-in";
import { SearchBar } from "@/components/search/search-bar";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Lightbox } from "@/components/photos/lightbox";
import { Button } from "@/components/ui/button";
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { userId, isLoading: userLoading } = useCurrentUser();
  const { aiOptIn, isLoading: aiOptInLoading } = useAiOptIn();
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
        setSearchError(null);
        return;
      }
      setIsSearching(true);
      setSearchError(null);
      try {
        const res = await semanticSearch({ query: q.trim(), limit: 30 });
        setResults(res ?? []);
        setHasSearched(true);
      } catch {
        setResults([]);
        setHasSearched(true);
        setSearchError("Search is temporarily unavailable. Please try again.");
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
        setSearchError(null);
        return;
      }
      searchTimeoutRef.current = setTimeout(() => doSearch(q), 400);
    },
    [doSearch],
  );

  // Collect all unique tags from results
  const allTags = Array.from(
    new Set(
      results.flatMap((r: any) => [
        ...(r.photo?.hashtags ?? []).map((tag: string) => `#${tag}`),
        ...(r.photo?.aiTagsV2 ?? []),
      ]),
    ),
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
  const filteredResults =
    activeTags.size > 0
      ? results.filter((r: any) => {
          const tags: string[] = [
            ...(r.photo?.hashtags ?? []).map((tag: string) => `#${tag}`),
            ...(r.photo?.aiTagsV2 ?? []),
          ];
          return Array.from(activeTags).some((t) => tags.includes(t));
        })
      : results;

  const photos = filteredResults.map((r: any) => r.photo).filter(Boolean);

  if (userLoading || aiOptInLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center bg-background">
        <h3 className="text-[18px] font-semibold text-foreground mb-2">
          Sign in to search your photos
        </h3>
        <p className="text-[14px] text-muted-foreground max-w-md mb-8">
          Search is personalized to your account.
        </p>
        <Link href="/login">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-6 font-medium border-border hover:bg-muted"
          >
            Go to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2 mt-4 md:mt-8 mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
              Search
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Find any photo with AI
            </p>
          </div>
          <SearchBar onSearch={handleSearch} className="w-full" />

          {!query ? (
            <div className="space-y-10">
              {/* Categories */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[14px] font-medium text-muted-foreground">
                    Explore
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-[15px] font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
                      onClick={() => handleSearch(cat.name)}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Features banner */}
              <div
                className={cn(
                  "rounded-2xl border p-6",
                  aiOptIn === true
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-card shadow-sm",
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles
                        className={cn(
                          "h-5 w-5",
                          aiOptIn === true
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                      <h3 className="text-[16px] font-semibold text-foreground">
                        AI-Powered Search
                      </h3>
                      {aiOptIn === true && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary ml-1">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] text-muted-foreground leading-relaxed mt-2 max-w-lg">
                      Search naturally with hybrid intelligence. Semantic
                      matches work alongside captions, tags, filenames, dates,
                      and locations, so exact queries and fuzzy memory-based
                      queries both work better.
                    </p>
                  </div>
                  {aiOptIn !== true && (
                    <Link
                      href="/settings"
                      className="shrink-0 ml-4 flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Enable
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {query && (
          <div>
            {/* Results header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-[16px] font-medium text-muted-foreground">
                  {isSearching
                    ? "Searching..."
                    : hasSearched
                      ? `${photos.length} result${photos.length !== 1 ? "s" : ""} for`
                      : "Results for"}{" "}
                  <span className="text-foreground font-semibold">
                    &quot;{query}&quot;
                  </span>
                </span>
                {isSearching && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
                )}
              </div>
              {activeTags.size > 0 && (
                <button
                  onClick={() => setActiveTags(new Set())}
                  className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Tag chips for filtering */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <div className="flex items-center gap-1.5 mr-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[14px] font-medium text-muted-foreground">
                    Filter:
                  </span>
                </div>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-150",
                      activeTags.has(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {tag}
                    {activeTags.has(tag) && <X className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            )}

            {searchError && (
              <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[14px] text-destructive">
                {searchError}
              </div>
            )}

            {/* No results state */}
            {hasSearched && !isSearching && photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-6 shadow-sm border border-border">
                  <SearchX className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-[18px] font-semibold text-foreground mb-2">
                  No results found
                </p>
                <p className="text-[15px] text-muted-foreground max-w-md text-center">
                  {aiOptIn
                    ? "Try a different phrase, a location, a date, or a filename fragment."
                    : "Try a location, filename, date, or simple phrase. Enabling AI improves semantic matches even more."}
                </p>
              </div>
            ) : (
              <div className="-mx-4 md:-mx-8">
                <PhotoGrid
                  photos={photos}
                  onPhotoClick={(_, index) => setLightboxIndex(index)}
                  onFavorite={(id) => toggleFavorite({ photoId: id as any })}
                  emptyMessage={isSearching ? "Searching..." : "No results"}
                  emptyIcon={<SearchIcon className="h-12 w-12 opacity-50" />}
                />
              </div>
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
    </div>
  );
}
