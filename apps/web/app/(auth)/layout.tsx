import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { Lock, Shield, Sparkles, Upload } from "lucide-react";

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
    redirect("/feed");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Abstract halftone pattern background */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at center, currentColor 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[28rem] w-[28rem] rounded-full bg-primary/5 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-primary/5 blur-[140px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-r border-border px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16 relative">
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-foreground">Nostalgia</p>
              <p className="text-[12px] text-muted-foreground font-medium">Private photo intelligence</p>
            </div>
          </div>

          <div className="max-w-xl relative z-10">
            <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground xl:text-5xl leading-tight">
              Keep every photo in one private, searchable home.
            </h1>

            <div className="mt-12 space-y-4">
              {[
                {
                  icon: Upload,
                  title: "Import without losing structure",
                },
                {
                  icon: Shield,
                  title: "Private by design",
                },
                {
                  icon: Sparkles,
                  title: "Rediscover with AI",
                },
              ].map(({ icon: Icon, title }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-[15px] font-semibold text-foreground">{title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[13px] font-medium text-muted-foreground">
            Encrypted originals. Intelligent rediscovery. A cleaner foundation.
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 bg-muted/30">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 justify-center lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[18px] font-semibold tracking-tight text-foreground">Nostalgia</p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-7 shadow-xl sm:p-10 relative z-10">
              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
