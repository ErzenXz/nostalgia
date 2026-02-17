"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Atmospheric background gradient */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 60% at 70% -10%, rgba(42, 26, 58, 0.12), transparent 50%),
            radial-gradient(ellipse 80% 50% at 100% 30%, rgba(26, 26, 42, 0.08), transparent 40%),
            radial-gradient(ellipse 60% 40% at 20% 90%, rgba(58, 26, 42, 0.06), transparent 30%)
          `,
        }}
      />
      <Sidebar />
      <main className="relative z-10 pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
