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
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Users,
  Home,
} from "lucide-react";

// ── Navigation sections ──────────────────────────────────────────
const navSections = [
  {
    label: null,
    items: [
      { name: "Home", href: "/feed", icon: Home, mobile: true },
      { name: "Photos", href: "/photos", icon: Images, mobile: true },
      { name: "Search", href: "/search", icon: Search, mobile: true },
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
    items: [
      { name: "Trash", href: "/trash", icon: Trash2, mobile: false },
    ],
  },
];

const mobileNavItems = navSections.flatMap((s) => s.items).filter((i) => i.mobile);

// ── Storage stats ────────────────────────────────────────────────

function StorageStats({ collapsed }: { collapsed: boolean }) {
  const { userId } = useCurrentUser();
  const storageStats = useQuery(api.users.getStorageStats, userId ? { userId } : "skip");

  const usedBytes = storageStats?.usedStorageBytes ?? 0;
  const quotaBytes = storageStats?.storageQuotaBytes ?? 15 * 1024 * 1024 * 1024;
  const percent = storageStats?.percentUsed ?? 0;

  if (collapsed) {
    return (
      <div className="p-3 flex justify-center">
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#2a2a2a" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke="#c9a66b" strokeWidth="3"
              strokeDasharray={`${percent * 0.942} 94.2`}
              className="transition-all duration-500"
            />
          </svg>
          <HardDrive className="absolute inset-0 m-auto h-3 w-3 text-[#888]" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-[#888]" />
          <span className="text-[12px] font-medium text-[#ccc]">Storage</span>
        </div>
        <span className="text-[12px] text-[#888]">{Math.round(percent)}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[#888]">
        {formatBytes(usedBytes)} of {formatBytes(quotaBytes)} used
      </p>
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
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.name : undefined}
      onClick={onClick}
      className={cn(
        "relative flex items-center rounded-lg text-[13px] transition-all duration-150 select-none group",
        collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-3 px-3 py-2.5 w-full",
        isActive
          ? "bg-white/[0.09] text-white font-medium"
          : "text-[#b8b8b8] hover:bg-white/[0.05] hover:text-white",
      )}
    >
      {/* Amber left accent on active */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-full bg-primary" />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive ? "text-primary" : "text-[#888] group-hover:text-[#ccc]",
        )}
      />
      {!collapsed && <span className="leading-none tracking-[-0.01em]">{item.name}</span>}
    </Link>
  );
}

// ── Desktop Sidebar ───────────────────────────────────────────────

export function Sidebar() {
  const convexAvailable = useConvexAvailable();
  const { collapsed, toggle } = useSidebarStore();
  const { user } = useCurrentUser();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col",
        "bg-sidebar border-r border-white/[0.07] transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[232px]",
      )}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center",
          collapsed ? "justify-center px-2" : "gap-2.5 px-4",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-[0_0_12px_rgba(201,166,107,0.3)]">
          <Lock className="h-3.5 w-3.5 text-black" />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold text-white tracking-tight font-heading">
            Nostalgia
          </span>
        )}
      </div>

      {/* ── Upload button ── */}
      <div className={cn("shrink-0", collapsed ? "px-2.5 pb-3" : "px-3 pb-3")}>
        <Link
          href="/photos?upload=true"
          className={cn(
            "flex items-center justify-center rounded-full text-[13px] font-semibold text-black transition-all active:scale-[0.97]",
            "bg-primary hover:brightness-110",
            "shadow-[0_2px_12px_rgba(201,166,107,0.3)]",
            collapsed ? "h-9 w-9 mx-auto" : "gap-2 px-4 py-2 w-full",
          )}
        >
          <Upload className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Upload</span>}
        </Link>
      </div>

      {/* ── Nav sections ── */}
      <nav className={cn("flex-1 overflow-y-auto", collapsed ? "px-2 space-y-1" : "px-3 space-y-5")}>
        {navSections.map((section, si) => (
          <div key={si} className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
            {section.label && !collapsed && (
              <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666] select-none">
                {section.label}
              </p>
            )}
            {section.items.map((item) => (
              <NavItem key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* ── AI indexing ── */}
      {convexAvailable && <AiIndexingProgress collapsed={collapsed} />}

      {/* ── Storage ── */}
      <div className="shrink-0 border-t border-white/[0.07]">
        {convexAvailable ? (
          <StorageStats collapsed={collapsed} />
        ) : (
          <div className={cn("px-4 py-3", collapsed && "hidden")} />
        )}
      </div>

      {/* ── User + Settings + Collapse ── */}
      <div className="shrink-0 border-t border-white/[0.07] p-2 space-y-0.5">
        {/* User profile */}
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-default mb-0.5">
            <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-primary uppercase">
                {(user.name ?? user.email ?? "U").charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate leading-none">
                {user.name ?? user.email}
              </p>
              {user.name && (
                <p className="text-[11px] text-[#888] truncate mt-0.5 leading-none">{user.email}</p>
              )}
            </div>
          </div>
        )}

        {/* Collapsed user avatar */}
        {collapsed && user && (
          <div className="flex justify-center py-1 mb-0.5">
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-[11px] font-bold text-primary uppercase">
                {(user.name ?? user.email ?? "U").charAt(0)}
              </span>
            </div>
          </div>
        )}

        {/* Settings */}
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center rounded-lg text-[13px] text-[#b8b8b8] hover:bg-white/[0.05] hover:text-white transition-colors",
            collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-3 px-3 py-2.5 w-full",
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0 text-[#888]" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className={cn(
            "flex items-center rounded-lg text-[13px] text-[#b8b8b8] hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer w-full",
            collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-3 px-3 py-2.5",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] text-[#888]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0 text-[#888]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

// ── Mobile header ─────────────────────────────────────────────────

export function MobileHeader() {
  const { mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex md:hidden h-12 items-center justify-between bg-sidebar/95 backdrop-blur-md px-4 border-b border-white/[0.07]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shadow-[0_0_8px_rgba(201,166,107,0.25)]">
          <Lock className="h-3 w-3 text-black" />
        </div>
        <span className="text-[14px] font-semibold text-white font-heading">Nostalgia</span>
      </div>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#888] hover:text-white hover:bg-white/[0.05] transition-colors"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden cursor-default"
        onClick={close}
      />
      <div className="fixed top-0 left-0 bottom-0 z-50 w-[232px] bg-sidebar border-r border-white/[0.07] flex flex-col md:hidden animate-in slide-in-from-left duration-200 shadow-[4px_0_32px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex h-12 items-center justify-between px-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Lock className="h-3 w-3 text-black" />
            </div>
            <span className="text-[14px] font-semibold text-white font-heading">Nostalgia</span>
          </div>
          <button
            onClick={close}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-[#888] hover:text-white hover:bg-white/[0.05]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Upload */}
        <div className="px-3 py-3 shrink-0">
          <Link
            href="/photos?upload=true"
            onClick={close}
            className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-black bg-primary hover:brightness-110 shadow-[0_2px_12px_rgba(201,166,107,0.3)]"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-5">
          {navSections.map((section, si) => (
            <div key={si} className="space-y-0.5">
              {section.label && (
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666] select-none">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <NavItem key={item.href} item={item} collapsed={false} onClick={close} />
              ))}
            </div>
          ))}
        </nav>

        {convexAvailable && <AiIndexingProgress collapsed={false} />}

        <div className="shrink-0 border-t border-white/[0.07]">
          {convexAvailable && <StorageStats collapsed={false} />}
        </div>

        <div className="shrink-0 border-t border-white/[0.07] p-2">
          <Link
            href="/settings"
            onClick={close}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-[#b8b8b8] hover:bg-white/[0.05] hover:text-white transition-colors"
          >
            <Settings className="h-[18px] w-[18px] text-[#888]" />
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden h-[56px] items-center justify-around border-t border-white/[0.07] bg-sidebar/97 backdrop-blur-md safe-area-pb">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors",
              isActive ? "text-white" : "text-[#888] active:text-white",
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
            <span className={cn("text-[10px] font-medium", isActive ? "text-white" : "text-[#888]")}>
              {item.name}
            </span>
          </Link>
        );
      })}
      <Link
        href="/settings"
        className={cn(
          "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors",
          pathname === "/settings" ? "text-white" : "text-[#888] active:text-white",
        )}
      >
        <Settings className={cn("h-5 w-5", pathname === "/settings" && "text-primary")} />
        <span className={cn("text-[10px] font-medium", pathname === "/settings" ? "text-white" : "text-[#888]")}>
          Settings
        </span>
      </Link>
    </nav>
  );
}
