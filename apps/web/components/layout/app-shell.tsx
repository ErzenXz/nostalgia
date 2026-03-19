"use client";

import { type ReactNode } from "react";
import {
  TopNavbar,
  MobileHeader,
  MobileDrawer,
  MobileTabBar,
} from "./sidebar";
import { PageTransition } from "./page-transition";
import { NavProgress } from "./nav-progress";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground pt-16">
      <NavProgress />

      <TopNavbar />

      <MobileHeader />
      <MobileDrawer />
      <MobileTabBar />

      <main
        className={cn(
          "relative z-10 min-h-screen",
          "mx-auto max-w-7xl",
          "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
        )}
      >
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
