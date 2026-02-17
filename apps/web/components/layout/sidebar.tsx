"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useConvexAvailable } from "@/components/providers/convex-provider";
import { useSidebarStore } from "@/store/sidebar";
import { TimelineWidget } from "@/components/layout/timeline-widget";
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
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { name: "Feed", href: "/feed", icon: Clapperboard, mobile: true },
  { name: "Photos", href: "/photos", icon: Images, mobile: true },
  { name: "Search", href: "/search", icon: Search, mobile: true },
  { name: "Favorites", href: "/favorites", icon: Heart, mobile: false },
  { name: "Albums", href: "/albums", icon: FolderOpen, mobile: true },
  { name: "Map", href: "/map", icon: Map, mobile: false },
  { name: "Memories", href: "/memories", icon: Sparkles, mobile: false },
  { name: "Archive", href: "/archive", icon: Archive, mobile: false },
  { name: "Trash", href: "/trash", icon: Trash2, mobile: false },
];

const mobileNav = navigation.filter((n) => n.mobile);

function SidebarStorageStats({ collapsed }: { collapsed: boolean }) {
  const { userId } = useCurrentUser();

  const storageStats = useQuery(
    api.users.getStorageStats,
    userId ? { userId } : "skip",
  );

  const usedBytes = storageStats?.usedStorageBytes ?? 0;
  const quotaBytes = storageStats?.storageQuotaBytes ?? 15 * 1024 * 1024 * 1024;
  const percentUsed = storageStats?.percentUsed ?? 0;

  if (collapsed) {
    return (
      <div className="border-t border-border p-3 flex justify-center">
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-secondary"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${percentUsed * 0.942} 94.2`}
              className="text-primary transition-all duration-500"
            />
          </svg>
          <HardDrive className="absolute inset-0 m-auto h-3 w-3 text-muted-foreground" />
        </div>
      </div>
    );
  }

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
        {formatBytes(usedBytes)}{" "}
        <span className="text-muted-foreground/50">of</span>{" "}
        {formatBytes(quotaBytes)}
      </p>
    </div>
  );
}

function SidebarStorageFallback({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="border-t border-border p-3 flex justify-center">
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

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

/** Desktop sidebar - collapsible */
export function Sidebar() {
  const pathname = usePathname();
  const convexAvailable = useConvexAvailable();
  const { collapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "gap-3 px-5",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Lock className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Nostalgia
            </h1>
            <p className="text-[9px] font-medium text-muted-foreground tracking-widest">
              ENCRYPTED
            </p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className={cn("py-3", collapsed ? "px-2" : "px-3")}>
        <Link
          href="/photos?upload=true"
          className={cn(
            "flex items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]",
            collapsed ? "h-10 w-10 mx-auto" : "gap-2 px-4 py-2.5 w-full",
          )}
        >
          <Upload className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Upload</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 space-y-0.5 overflow-y-auto",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group relative flex items-center rounded-lg text-sm transition-all duration-200",
                collapsed
                  ? "h-10 w-10 mx-auto justify-center"
                  : "gap-3 px-3 py-2",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Timeline widget (only when expanded) */}
      {!collapsed && convexAvailable && <TimelineWidget />}

      {/* Storage */}
      <div className="relative z-10">
        {convexAvailable ? (
          <SidebarStorageStats collapsed={collapsed} />
        ) : (
          <SidebarStorageFallback collapsed={collapsed} />
        )}
      </div>

      {/* Settings + Collapse toggle */}
      <div className="border-t border-border p-2 space-y-0.5">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "group flex items-center rounded-lg text-sm text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-foreground",
            collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-3 px-3 py-2",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={toggle}
          className={cn(
            "flex items-center rounded-lg text-sm text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-foreground cursor-pointer",
            collapsed
              ? "h-10 w-10 mx-auto justify-center"
              : "gap-3 px-3 py-2 w-full",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

/** Mobile header with hamburger menu */
export function MobileHeader() {
  const { mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex md:hidden h-12 items-center justify-between border-b border-border bg-sidebar/95 backdrop-blur-md px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Lock className="h-3 w-3 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">Nostalgia</span>
      </div>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );
}

/** Mobile slide-over drawer for full navigation */
export function MobileDrawer() {
  const { mobileOpen, setMobileOpen } = useSidebarStore();
  const pathname = usePathname();
  const convexAvailable = useConvexAvailable();

  if (!mobileOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close navigation"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden cursor-default"
        onClick={() => setMobileOpen(false)}
      />
      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-sidebar border-r border-border flex flex-col md:hidden animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Lock className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Nostalgia</h1>
              <p className="text-[9px] font-medium text-muted-foreground tracking-widest">
                ENCRYPTED
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Upload */}
        <div className="px-3 py-3">
          <Link
            href="/photos?upload=true"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Storage */}
        <div className="relative z-10">
          {convexAvailable ? (
            <SidebarStorageStats collapsed={false} />
          ) : (
            <SidebarStorageFallback collapsed={false} />
          )}
        </div>

        {/* Settings */}
        <div className="border-t border-border p-3">
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </>
  );
}

/** Mobile bottom tab bar */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden h-14 items-center justify-around border-t border-border bg-sidebar/95 backdrop-blur-md safe-area-pb">
      {mobileNav.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground active:text-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
      <Link
        href="/settings"
        className={cn(
          "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
          pathname === "/settings"
            ? "text-primary"
            : "text-muted-foreground active:text-foreground",
        )}
      >
        <Settings className="h-5 w-5" />
        <span className="text-[10px] font-medium">Settings</span>
      </Link>
    </nav>
  );
}
