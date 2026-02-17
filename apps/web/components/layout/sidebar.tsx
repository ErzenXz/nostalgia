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
    <div className="border-t border-border p-4">
      <div className="mb-3 flex items-center gap-2">
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Storage</span>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {formatBytes(usedBytes)} <span className="text-muted-foreground/50">of</span> {formatBytes(quotaBytes)}
      </p>
    </div>
  );
}

/**
 * Static fallback for storage section when Convex is unavailable (e.g. during build).
 */
function SidebarStorageFallback() {
  return (
    <div className="border-t border-border p-4">
      <div className="mb-3 flex items-center gap-2">
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Storage</span>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-0 rounded-full bg-primary" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        0 B <span className="text-muted-foreground/50">of</span> 15 GB
      </p>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const convexAvailable = useConvexAvailable();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Lock className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-medium text-foreground">
            Nostalgia
          </h1>
          <p className="text-[10px] text-muted-foreground">
            ENCRYPTED PHOTOS
          </p>
        </div>
      </div>

      {/* Upload Button */}
      <div className="px-4 py-4">
        <Link
          href="/photos?upload=true"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Upload Photos
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Storage — conditionally uses Convex hooks */}
      <div className="relative z-10">
        {convexAvailable ? <SidebarStorageStats /> : <SidebarStorageFallback />}
      </div>

      {/* Settings */}
      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/settings"
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
