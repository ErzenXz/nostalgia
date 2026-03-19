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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[rgba(205,168,107,0.08)] blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-[rgba(205,168,107,0.04)] blur-[140px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-r border-white/[0.06] px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-primary text-primary-foreground">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Nostalgia</p>
              <p className="text-[12px] text-muted-foreground">Private photo intelligence</p>
            </div>
          </div>

          <div className="max-w-xl">
            <h1 className="text-4xl font-serif font-bold tracking-[-0.03em] text-foreground xl:text-5xl">
              Keep every photo in one private, searchable home.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground">
              Upload, organize, rediscover, and later share with intent. The product is built
              around your own library first, with encryption and AI layered in where they
              actually help.
            </p>

            <div className="mt-10 space-y-4">
              {[
                {
                  icon: Upload,
                  title: "Import without losing structure",
                  body: "Bring in your archive, then browse it as a living library instead of a dump folder.",
                },
                {
                  icon: Shield,
                  title: "Private by design",
                  body: "Client-side encryption keeps originals under your control from the first upload onward.",
                },
                {
                  icon: Sparkles,
                  title: "Rediscover with AI",
                  body: "Turn on intelligence when you want ranked memories, search, and better resurfacing.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-foreground">{title}</p>
                      <p className="mt-1 text-[14px] leading-6 text-muted-foreground">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground">
            Encrypted originals. Intelligent rediscovery. A cleaner foundation for web, iOS, and Android.
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-primary text-primary-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Nostalgia</p>
                <p className="text-[12px] text-muted-foreground">Private photo intelligence</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-[rgba(17,14,12,0.86)] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-8">
              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
