import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { Lock, Shield, Sparkles, Heart } from "lucide-react";

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
    <div className="relative min-h-screen bg-background flex overflow-hidden">
      {/* Atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-amber-600/[0.05] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-amber-800/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* ── Left panel — brand (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] shrink-0 flex-col relative border-r border-amber-900/20 bg-[#0a0908]">
        {/* Film strips top/bottom */}
        <div className="flex items-center justify-around px-4 h-[18px] shrink-0 bg-black/40">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-3.5 h-2.5 rounded-[2px] bg-[#141210] border border-amber-900/15 shrink-0" />
          ))}
        </div>

        {/* Main brand content */}
        <div className="flex-1 flex flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-b from-amber-500 to-amber-600 shadow-[0_0_16px_rgba(201,166,107,0.2)]">
              <Lock className="h-4 w-4 text-amber-950" />
            </div>
            <div>
              <span className="text-sm font-heading font-semibold text-foreground/95">Nostalgia</span>
              <p className="text-[9px] font-mono text-amber-700/50 tracking-[0.2em] uppercase">Encrypted</p>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <h2 className="text-2xl xl:text-3xl font-heading font-semibold text-foreground/90 leading-tight mb-4">
              Your private<br />
              <span className="text-amber-400/85">darkroom</span>
            </h2>
            <p className="text-xs font-mono text-amber-800/50 leading-relaxed max-w-xs">
              Client-side encryption means only you can see your memories.
              Not even we can access them.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-6">
              {[
                { icon: Shield, label: "AES-256 Encrypted" },
                { icon: Sparkles, label: "AI Powered" },
                { icon: Heart, label: "Nostalgia Feed" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-amber-950/35 border border-amber-900/20 text-[9px] font-mono text-amber-700/60 uppercase tracking-wider"
                >
                  <Icon className="h-2.5 w-2.5" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Decorative film frames at the bottom */}
          <div className="flex gap-2 opacity-30">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 flex-1 rounded-sm border border-amber-900/30 bg-amber-950/20"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </div>
        </div>

        {/* Film strip bottom */}
        <div className="flex items-center justify-around px-4 h-[18px] shrink-0 bg-black/40">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-3.5 h-2.5 rounded-[2px] bg-[#141210] border border-amber-900/15 shrink-0" />
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen p-5 sm:p-8">
        {/* Mobile logo (shown only on mobile since left panel is hidden) */}
        <div className="flex lg:hidden items-center gap-2.5 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-amber-500 to-amber-600 shadow-[0_0_14px_rgba(201,166,107,0.2)]">
            <Lock className="h-3.5 w-3.5 text-amber-950" />
          </div>
          <span className="text-sm font-heading font-semibold text-foreground/95">Nostalgia</span>
        </div>

        <div className="w-full max-w-sm">
          <div
            className="rounded-2xl border border-amber-900/18 bg-[#0f0e0d]/90 backdrop-blur-xl shadow-[0_8px_48px_rgba(0,0,0,0.8),0_0_0_1px_rgba(201,166,107,0.04)] p-7"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
