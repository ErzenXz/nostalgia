"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useConvexAvailable } from "@/components/providers/convex-provider";
import { useSidebarStore } from "@/store/sidebar";
import { AiIndexingProgress } from "@/components/ai-indexing-progress";
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
  Menu,
  X,
  Users,
  Home,
  MonitorPlay,
  Heart as HeartOutline,
} from "lucide-react";

// ── Navigation sections ──────────────────────────────────────────
const navSections = [
  {
    label: null,
    items: [
      { name: "Home", href: "/feed", icon: Home, mobile: true },
      { name: "Search", href: "/search", icon: Search, mobile: true },
      { name: "Photos", href: "/photos", icon: Images, mobile: true },
    ],
  },
  {
    label: "Library",
    items: [
      { name: "Albums", href: "/albums", icon: FolderOpen, mobile: true },
      { name: "Memories", href: "/memories", icon: Sparkles, mobile: false },
      { name: "Favorites", href: "/favorites", icon: Heart, mobile: false },
      { name: "Archive", href: "/archive", icon: Archive, mobile: false },
    ],
  },
  {
    label: "Discover",
    items: [
      { name: "People", href: "/albums/people", icon: Users, mobile: false },
      { name: "Map", href: "/map", icon: Map, mobile: false },
    ],
  },
  {
    label: "System",
    items: [{ name: "Trash", href: "/trash", icon: Trash2, mobile: false }],
  },
];

const mobileNavItems = navSections
  .flatMap((s) => s.items)
  .filter((i) => i.mobile);

const interactiveBase =
  "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-[14px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// ── Storage stats ────────────────────────────────────────────────

function StorageStats({ collapsed }: { collapsed: boolean }) {
  const { userId } = useCurrentUser();
  const storageStats = useQuery(
    api.users.getStorageStats,
    userId ? { userId } : "skip",
  );

  const usedBytes = storageStats?.usedStorageBytes ?? 0;
  const quotaBytes = storageStats?.storageQuotaBytes ?? 15 * 1024 * 1024 * 1024;
  const percent = storageStats?.percentUsed ?? 0;

  if (collapsed) {
    return (
      <div className="px-2 py-3">
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 px-2 py-3">
          <div className="text-center">
            <HardDrive className="mx-auto h-4 w-4 text-muted-foreground" />
            <p className="mt-1 text-[11px] font-medium text-foreground">
              {Math.round(percent)}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium text-foreground">
              Storage
            </span>
          </div>
          <span className="text-[12px] text-muted-foreground">
            {Math.round(percent)}%
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          {formatBytes(usedBytes)} of {formatBytes(quotaBytes)} used
        </p>
      </div>
    </div>
  );
}

// ── Nav item ─────────────────────────────────────────────────────

function NavItem({
  item,
  collapsed,
  onClick,
}: {
  item: { name: string; href: string; icon: React.ElementType };
  collapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.name : undefined}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        interactiveBase,
        "select-none group",
        collapsed ? "h-12 w-12 justify-center px-0" : "w-full",
        isActive
          ? "bg-accent text-accent-foreground font-semibold"
          : "text-foreground hover:bg-muted/50",
      )}
    >
      <Icon
        className={cn(
          "h-[22px] w-[22px] shrink-0 transition-transform group-hover:scale-110 duration-200",
          isActive
            ? "text-foreground stroke-[2.5]"
            : "text-foreground stroke-[1.5]",
        )}
      />
      {!collapsed && <span className="leading-none">{item.name}</span>}
    </Link>
  );
}

// ── Top Navbar ───────────────────────────────────────────────────

export function TopNavbar() {
  const { user } = useCurrentUser();
  const pathname = usePathname();

  const topNavItems = [
    { name: "Home", href: "/feed", icon: Home },
    { name: "Search", href: "/search", icon: Search },
    { name: "Videos", href: "/videos", icon: MonitorPlay },
    { name: "Photos", href: "/photos", icon: Images },
    { name: "Activity", href: "/favorites", icon: HeartOutline },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 hidden md:flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <Link href="/feed" className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Lock className="h-4 w-4" />
        </div>
        <span className="text-[20px] font-serif font-bold tracking-tight text-foreground">
          Nostalgia
        </span>
      </Link>

      <nav className="flex items-center justify-center gap-6 absolute left-1/2 -translate-x-1/2">
        {topNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted/50 relative group"
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-transform group-hover:scale-110 duration-200",
                  isActive
                    ? "text-foreground stroke-[2.5]"
                    : "text-muted-foreground stroke-[1.5]",
                )}
              />
              {isActive && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-4">
        <Link
          href="/upload"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        >
          <Upload className="h-5 w-5" />
        </Link>
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted/50"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </Link>
        {user && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[12px] font-semibold uppercase text-foreground">
                {(user.name ?? user.email ?? "U").charAt(0)}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

// ── Mobile header ─────────────────────────────────────────────────

export function MobileHeader() {
  const { mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      <Link href="/feed" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <Lock className="h-3.5 w-3.5" />
        </div>
        <span className="text-[18px] font-serif font-bold tracking-tight text-foreground">
          Nostalgia
        </span>
      </Link>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
    </div>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────

export function MobileDrawer() {
  const { mobileOpen, setMobileOpen } = useSidebarStore();
  const convexAvailable = useConvexAvailable();
  const close = () => setMobileOpen(false);

  if (!mobileOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className="fixed inset-0 z-50 cursor-default bg-black/40 backdrop-blur-sm md:hidden"
        onClick={close}
      />
      <div className="fixed top-0 left-0 bottom-0 z-50 flex w-[280px] max-w-[82vw] flex-col border-r border-border bg-background md:hidden shadow-2xl">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link
            href="/feed"
            onClick={close}
            className="flex items-center gap-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <span className="text-[18px] font-serif font-bold tracking-tight text-foreground">
              Nostalgia
            </span>
          </Link>
          <button
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section, si) => (
            <div key={si} className={cn(si > 0 && "mt-6", "space-y-1")}>
              {section.label && (
                <p className="px-3 pb-2 text-[12px] font-semibold text-muted-foreground select-none">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  collapsed={false}
                  onClick={close}
                />
              ))}
            </div>
          ))}
        </nav>

        {convexAvailable && <AiIndexingProgress collapsed={false} />}

        <div className="shrink-0 border-t border-border">
          {convexAvailable && <StorageStats collapsed={false} />}
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <Link
            href="/upload"
            onClick={close}
            className={cn(
              interactiveBase,
              "w-full justify-center bg-primary text-primary-foreground shadow-sm hover:opacity-90 mb-2",
            )}
          >
            <Upload className="h-[20px] w-[20px]" />
            <span className="font-semibold">Upload</span>
          </Link>

          <Link
            href="/settings"
            onClick={close}
            className={cn(
              interactiveBase,
              "w-full text-foreground hover:bg-muted/50",
            )}
          >
            <Settings className="h-[22px] w-[22px] text-inherit" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </>
  );
}

// ── Mobile bottom tab bar ─────────────────────────────────────────

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[64px] items-stretch justify-around border-t border-border bg-background/95 backdrop-blur-md safe-area-pb md:hidden">
      {mobileNavItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] transition-colors",
              isActive
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6 transition-transform duration-200",
                isActive
                  ? "text-foreground stroke-[2.5] scale-110"
                  : "text-muted-foreground stroke-[1.5]",
              )}
            />
            {/* Instagram doesn't show text on bottom bar, clean look */}
          </Link>
        );
      })}
      <Link
        href="/settings"
        aria-current={pathname === "/settings" ? "page" : undefined}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] transition-colors",
          pathname === "/settings"
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Settings
          className={cn(
            "h-6 w-6 transition-transform duration-200",
            pathname === "/settings"
              ? "text-foreground stroke-[2.5] scale-110"
              : "text-muted-foreground stroke-[1.5]",
          )}
        />
      </Link>
    </nav>
  );
}
