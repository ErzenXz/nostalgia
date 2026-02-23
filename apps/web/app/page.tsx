import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Shield,
  Sparkles,
  MapPin,
  Heart,
  ArrowRight,
  Github,
  Camera,
  Layers,
} from "lucide-react";

// ─── Film Strip Decoration ─────────────────────────────────

function FilmStrip({ count = 32 }: { count?: number }) {
  return (
    <div className="w-full h-[22px] bg-[#080706] flex items-center justify-around px-4 overflow-hidden shrink-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-3 rounded-[2px] bg-[#141210] border border-amber-900/15 shrink-0"
        />
      ))}
    </div>
  );
}

// ─── Feature Card ──────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  category,
  title,
  description,
}: {
  icon: typeof Lock;
  category: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group film-print rounded-xl p-5 transition-all duration-400 hover:-translate-y-0.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/55 border border-amber-800/22 mb-4 group-hover:border-amber-700/40 transition-colors duration-300">
        <Icon className="h-4.5 w-4.5 text-amber-500/70 group-hover:text-amber-400/90 transition-colors duration-300" />
      </div>
      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-700/50 mb-1.5 block">
        {category}
      </span>
      <h3 className="text-sm font-serif font-medium text-foreground/90 mb-2">{title}</h3>
      <p className="text-xs text-amber-800/55 leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Security List Item ────────────────────────────────────

function SecurityItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-xs font-mono text-amber-800/60">
      <div className="mt-1.5 h-1 w-1 rounded-full bg-amber-600/60 shrink-0" />
      {children}
    </li>
  );
}

// ─── Landing Page ──────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Warm light-leak atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-600/[0.06] rounded-full blur-[160px]" />
        <div className="absolute bottom-1/3 right-0 w-[500px] h-[400px] bg-amber-800/[0.04] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-amber-900/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Film strip — very top */}
      <FilmStrip count={36} />

      {/* ── Navigation ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12 border-b border-amber-900/12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-b from-amber-500 to-amber-600 shadow-[0_0_16px_rgba(201,166,107,0.25)]">
            <Lock className="h-4 w-4 text-amber-950" />
          </div>
          <span className="text-base font-heading font-semibold text-foreground/95">Nostalgia</span>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-800/70 hover:text-amber-400 hover:bg-amber-950/30 font-mono text-xs uppercase tracking-wider"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500 shadow-[0_2px_8px_rgba(201,166,107,0.3)] font-mono text-xs uppercase tracking-wider"
              >
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </Suspense>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10">
        <section className="px-6 pt-20 pb-24 lg:px-12 text-center">
          <div className="mx-auto max-w-4xl">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-sm border border-amber-800/25 bg-amber-950/30 px-4 py-1.5 backdrop-blur-sm">
              <Shield className="h-3 w-3 text-emerald-400/80" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-700/70">
                End-to-end encrypted · Open source
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-semibold text-foreground/95 tracking-tight leading-[1.06]">
              Your memories,
              <br />
              <span className="text-amber-400/90">preserved</span>
              <br className="hidden sm:block" />
              {" "}in amber.
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-7 max-w-xl text-sm font-mono text-amber-800/55 leading-relaxed tracking-wide">
              A private darkroom for your life's most important moments.
              Client-side encryption · AI rediscovery · Zero-knowledge architecture.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Suspense fallback={null}>
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500 shadow-[0_4px_24px_rgba(201,166,107,0.3)] font-mono uppercase tracking-wider px-7"
                  >
                    Create Your Vault
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-amber-900/35 text-amber-700/70 hover:border-amber-700/50 hover:text-amber-400 hover:bg-amber-950/30 font-mono uppercase tracking-wider"
                  >
                    Sign In
                  </Button>
                </Link>
              </Suspense>
            </div>
          </div>

          {/* Decorative film strip divider */}
          <div className="mt-20 flex items-center gap-4 max-w-2xl mx-auto">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
            <div className="flex gap-1.5">
              {["ENCRYPT", "DISCOVER", "RELIVE", "PROTECT"].map((w) => (
                <span key={w} className="text-[8px] font-mono text-amber-900/35 uppercase tracking-wider px-2 py-1 border border-amber-900/15 rounded-sm">
                  {w}
                </span>
              ))}
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section className="px-6 pb-24 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-700/50 mb-3">
                Everything you need
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground/90">
                Built for the long term
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Lock}
                category="Security"
                title="Client-Side Encryption"
                description="Photos are encrypted in your browser before upload. We never see your content — not even thumbnails."
              />
              <FeatureCard
                icon={Sparkles}
                category="AI"
                title="AI Intelligence"
                description="Smart captions, auto-tags, and semantic search. AI analyzes only low-res thumbnails you explicitly allow."
              />
              <FeatureCard
                icon={MapPin}
                category="Discovery"
                title="Map View"
                description="Explore your life geographically. See the full map of where your memories were made."
              />
              <FeatureCard
                icon={Heart}
                category="Memory"
                title="Nostalgia Feed"
                description="Resurface forgotten moments — on this day, deep dives by year, and serendipitous discoveries."
              />
              <FeatureCard
                icon={Camera}
                category="Gallery"
                title="Cinematic Viewer"
                description="Film-inspired photo viewer with full EXIF metadata, color palette analysis, and related photos."
              />
              <FeatureCard
                icon={Shield}
                category="Auth"
                title="Passkeys & 2FA"
                description="Modern authentication with passkeys, TOTP two-factor, and trusted device management."
              />
            </div>
          </div>
        </section>

        {/* ── Zero-Knowledge Section ── */}
        <section className="px-6 pb-24 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="darkroom-panel rounded-2xl overflow-hidden">
              <div className="grid gap-0 lg:grid-cols-2">
                {/* Left — spec text */}
                <div className="p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-amber-900/12">
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-amber-700/50 mb-4">
                    Architecture
                  </p>
                  <h2 className="text-2xl font-heading font-semibold text-foreground/90 mb-4 leading-tight">
                    Zero-knowledge,<br />by design
                  </h2>
                  <p className="text-xs font-mono text-amber-800/55 leading-relaxed mb-6">
                    Your encryption key never leaves your device. Even if our servers were
                    compromised, your photos remain unreadable — mathematically guaranteed.
                  </p>
                  <ul className="space-y-2.5">
                    <SecurityItem>AES-256-GCM encryption for all photos</SecurityItem>
                    <SecurityItem>Key stored only in your browser's IndexedDB</SecurityItem>
                    <SecurityItem>Recovery bundle with PBKDF2-SHA-512 key wrapping</SecurityItem>
                    <SecurityItem>Post-quantum ready symmetric encryption scheme</SecurityItem>
                    <SecurityItem>Open source — audit the code yourself</SecurityItem>
                  </ul>
                </div>

                {/* Right — visual key card */}
                <div className="flex items-center justify-center p-8 lg:p-12 bg-black/20">
                  <div className="w-full max-w-[280px]">
                    {/* Outer frame */}
                    <div className="film-print rounded-xl p-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-950/60 border border-amber-800/25">
                          <Lock className="h-3.5 w-3.5 text-amber-500/75" />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-amber-600/70 uppercase tracking-wider">
                            Encryption Key
                          </p>
                          <p className="text-[9px] font-mono text-amber-900/40">
                            Stored locally · never transmitted
                          </p>
                        </div>
                      </div>

                      {/* Key display */}
                      <div className="rounded-lg bg-[#0a0908] border border-amber-900/15 p-3">
                        <p className="font-mono text-[11px] text-amber-800/40 tracking-widest break-all">
                          ••••••••••••••••••••••••••••••••••••••••
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400/70">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                          Never sent to server
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-amber-700/50">
                          <Shield className="h-3 w-3" />
                          AES-256-GCM
                        </div>
                      </div>

                      {/* Progress bars — visual cipher representation */}
                      <div className="space-y-1.5 pt-1">
                        {[85, 62, 91, 47, 73].map((w, i) => (
                          <div key={i} className="h-1 rounded-full bg-amber-950/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-700/40 to-amber-600/60"
                              style={{ width: `${w}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 pb-24 lg:px-12 text-center">
          <div className="mx-auto max-w-2xl">
            {/* Decorative line */}
            <div className="flex items-center gap-4 mb-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-900/20" />
              <Layers className="h-4 w-4 text-amber-800/30" />
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-900/20" />
            </div>

            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-700/50 mb-4">
              Get started today
            </p>
            <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground/90 mb-4">
              Ready to protect your memories?
            </h2>
            <p className="text-xs font-mono text-amber-800/50 mb-8 leading-relaxed">
              Free to use. Open source. No ads. No tracking.
              Your photos belong to you — always.
            </p>
            <Suspense fallback={null}>
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500 shadow-[0_4px_24px_rgba(201,166,107,0.3)] font-mono uppercase tracking-wider px-10"
                >
                  Create Your Vault
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Suspense>
          </div>
        </section>
      </main>

      {/* Film strip — bottom */}
      <FilmStrip count={36} />

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-amber-900/12 bg-[#0a0908]">
        <div className="mx-auto max-w-5xl px-6 py-6 lg:px-12">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-b from-amber-500 to-amber-600">
                <Lock className="h-3.5 w-3.5 text-amber-950" />
              </div>
              <span className="text-[10px] font-mono text-amber-900/40 uppercase tracking-wider">
                © 2026 Nostalgia · All rights reserved
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-900/40 hover:text-amber-600/70 transition-colors"
              >
                <Github className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
