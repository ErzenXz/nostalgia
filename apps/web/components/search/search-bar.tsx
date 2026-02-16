"use client";

import { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search as SearchIcon,
  X,
  Sparkles,
  MapPin,
  Calendar,
  Camera,
  Tag,
} from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const suggestions = [
  { icon: MapPin, label: "Beach", category: "Places" },
  { icon: Calendar, label: "Last summer", category: "Time" },
  { icon: Tag, label: "Family", category: "People" },
  { icon: Camera, label: "Sunset", category: "Scene" },
  { icon: Sparkles, label: "Birthday party", category: "Event" },
  { icon: MapPin, label: "Mountains", category: "Places" },
  { icon: Tag, label: "Pets", category: "Subject" },
  { icon: Calendar, label: "Christmas", category: "Event" },
];

export function SearchBar({
  onSearch,
  placeholder,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      onSearch(value);
    },
    [onSearch],
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder ?? "Search your photos with AI..."}
          className="pl-9 pr-9 bg-secondary/50 border-border/50 focus:bg-secondary"
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 hover:bg-accent"
            onClick={() => handleSearch("")}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isFocused && !query && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card p-3 shadow-xl z-50">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Try searching for
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                className="flex items-center gap-1.5 rounded-lg bg-secondary/80 px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                onClick={() => handleSearch(suggestion.label)}
              >
                <suggestion.icon className="h-3 w-3 text-muted-foreground" />
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
