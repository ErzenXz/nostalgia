import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { type ReactNode } from "react";

async function checkAuth() {
  try {
    const { isAuthenticated } = await import("@/lib/auth-server");
    return await isAuthenticated();
  } catch {
    return false;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const authenticated = await checkAuth();

  if (!authenticated) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
