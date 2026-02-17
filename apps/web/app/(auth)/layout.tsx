import { redirect } from "next/navigation";
import { type ReactNode } from "react";

async function checkAuth() {
  try {
    const { isAuthenticated } = await import("@/lib/auth-server");
    return await isAuthenticated();
  } catch {
    return false;
  }
}

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authenticated = await checkAuth();

  if (authenticated) {
    redirect("/photos");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] opacity-30" />
      
      {/* Content */}
      <div className="relative w-full max-w-md px-6">
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
