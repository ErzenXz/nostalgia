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
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Storage</span>
      </div>
      <Progress value={Math.min(percentUsed, 100)} className="mb-1.5" />
      <p className="text-[11px] text-muted-foreground">
        {formatBytes(usedBytes)} of {formatBytes(quotaBytes)} used
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
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Storage</span>
      </div>
      <Progress value={0} className="mb-1.5" />
      <p className="text-[11px] text-muted-foreground">
        {formatBytes(0)} of {formatBytes(15 * 1024 * 1024 * 1024)} used
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Lock className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Nostalgia
          </h1>
          <p className="text-[10px] text-muted-foreground leading-none">
            Encrypted Photos
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
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Storage — conditionally uses Convex hooks */}
      {convexAvailable ? <SidebarStorageStats /> : <SidebarStorageFallback />}

      {/* Settings */}
      <div className="border-t border-border p-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
