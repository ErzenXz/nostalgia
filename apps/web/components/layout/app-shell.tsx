"use client";

import { type ReactNode } from "react";
import {
  Sidebar,
  MobileHeader,
  MobileDrawer,
  MobileTabBar,
} from "./sidebar";
import { PageTransition } from "./page-transition";
import { NavProgress } from "./nav-progress";
import { useSidebarStore } from "@/store/sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <div className="relative min-h-screen bg-background">
      <NavProgress />

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile header + drawer + bottom bar */}
      <MobileHeader />
      <MobileDrawer />
      <MobileTabBar />

      {/* Main content area */}
      <main
        className={cn(
          "relative z-10 min-h-screen transition-all duration-300 ease-in-out",
          collapsed ? "md:pl-[68px]" : "md:pl-64",
          "pt-12 pb-16 md:pt-0 md:pb-0",
        )}
      >
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
