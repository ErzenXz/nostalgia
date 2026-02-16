"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
