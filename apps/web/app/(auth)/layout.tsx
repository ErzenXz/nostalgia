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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
