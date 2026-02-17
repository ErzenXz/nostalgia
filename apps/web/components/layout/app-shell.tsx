"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      <main className="relative z-10 pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
