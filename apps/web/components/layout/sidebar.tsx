"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useConvexAvailable } from "@/components/providers/convex-provider";
import { cn, formatBytes } from "@/lib/utils";
import {
  Images,
  Heart,
  Map,
  Archive,
  Trash2,
  FolderOpen,
  Sparkles,
  Search,
  Upload,
  Settings,
  HardDrive,
  Lock,
  Clapperboard,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const navigation = [
  { name: "Photos", href: "/photos", icon: Images },
  { name: "Favorites", href: "/favorites", icon: Heart },
  { name: "Albums", href: "/albums", icon: FolderOpen },
  { name: "Map", href: "/map", icon: Map },
  { name: "Memories", href: "/memories", icon: Sparkles },
  { name: "Feed", href: "/feed", icon: Clapperboard },
  { name: "Search", href: "/search", icon: Search },
  { name: "Archive", href: "/archive", icon: Archive },
  { name: "Trash", href: "/trash", icon: Trash2 },
];

/**
 * Inner component that uses Convex hooks for storage stats.
 * Only rendered when ConvexProvider is available.
 */
function SidebarStorageStats() {
  const { userId } = useCurrentUser();

  const storageStats = useQuery(
    api.users.getStorageStats,
    userId ? { userId } : "skip",
  );

  const usedBytes = storageStats?.usedStorageBytes ?? 0;
  const quotaBytes = storageStats?.storageQuotaBytes ?? 15 * 1024 * 1024 * 1024;
  const percentUsed = storageStats?.percentUsed ?? 0;

  return (
    <div className="border-t border-white/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <HardDrive className="h-3.5 w-3.5 text-amber-400/60" />
        <span className="text-xs font-light tracking-wide text-white/40">Storage</span>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400/60 to-amber-400/30 transition-all duration-500"
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      <p className="text-[11px] font-light text-white/30">
        {formatBytes(usedBytes)} <span className="text-white/20">of</span> {formatBytes(quotaBytes)}
      </p>
    </div>
  );
}

/**
 * Static fallback for storage section when Convex is unavailable (e.g. during build).
 */
function SidebarStorageFallback() {
  return (
    <div className="border-t border-white/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <HardDrive className="h-3.5 w-3.5 text-amber-400/60" />
        <span className="text-xs font-light tracking-wide text-white/40">Storage</span>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full w-0 rounded-full bg-gradient-to-r from-amber-400/60 to-amber-400/30" />
      </div>
      <p className="text-[11px] font-light text-white/30">
        0 B <span className="text-white/20">of</span> 15 GB
      </p>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const convexAvailable = useConvexAvailable();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/5 bg-sidebar">
      {/* Atmospheric gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 50% at 0% 0%, rgba(42, 26, 58, 0.15), transparent 50%),
            radial-gradient(ellipse 80% 40% at 0% 100%, rgba(58, 26, 42, 0.1), transparent 40%)
          `,
        }}
      />

      {/* Logo */}
      <div className="relative z-10 flex h-16 items-center gap-3 border-b border-white/5 px-6">
        <div className="relative flex h-9 w-9 items-center justify-center">
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-lg bg-amber-400/20 blur-md" />
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400/90 to-amber-600/80">
            <Lock className="h-4 w-4 text-black/70" />
          </div>
        </div>
        <div>
          <h1 className="text-base font-light tracking-wide text-white/90">
            Nostalgia
          </h1>
          <p className="text-[10px] font-light tracking-widest text-white/30">
            ENCRYPTED PHOTOS
          </p>
        </div>
      </div>

      {/* Upload Button */}
      <div className="relative z-10 px-4 py-4">
        <Link
          href="/photos?upload=true"
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-2.5 text-sm font-light tracking-wide transition-all"
        >
          {/* Button background with glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-amber-400/10 to-amber-400/20 opacity-50 transition-opacity group-hover:opacity-80" />
          <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-amber-400/30 group-hover:ring-amber-400/50" />
          <Upload className="relative z-10 h-4 w-4 text-amber-400/80 group-hover:text-amber-400 transition-colors" />
          <span className="relative z-10 text-amber-400/80 group-hover:text-amber-400 transition-colors">
            Upload Photos
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 space-y-0.5 overflow-y-auto px-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                isActive
                  ? "text-white/90"
                  : "text-white/40 hover:text-white/70",
              )}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "linear-gradient(90deg, rgba(201, 168, 124, 0.08) 0%, transparent 100%)",
                  }}
                />
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-amber-400/60" />
              )}
              <item.icon
                className={cn(
                  "relative z-10 h-4 w-4 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-amber-400/80" : "text-white/40 group-hover:text-white/60",
                )}
              />
              <span className="relative z-10 font-light tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Storage — conditionally uses Convex hooks */}
      <div className="relative z-10">
        {convexAvailable ? <SidebarStorageStats /> : <SidebarStorageFallback />}
      </div>

      {/* Settings */}
      <div className="relative z-10 border-t border-white/5 p-3">
        <Link
          href="/settings"
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/40 transition-all duration-200 hover:text-white/70"
        >
          <Settings className="h-4 w-4 transition-colors group-hover:text-white/60" />
          <span className="font-light tracking-wide">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
