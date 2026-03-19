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
  Eye,
  Share2,
  Search,
  Zap,
} from "lucide-react";

// ─── Sprocket Strip ─────────────────────────────────────────

function SprocketStrip() {
  return (
    <div className="w-full h-5 bg-[#060504] flex items-center justify-between px-3 overflow-hidden shrink-0 select-none" aria-hidden>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="w-3 h-2 rounded-[1.5px] bg-[#0f0d0b] border border-amber-900/10 shrink-0" />
      ))}
    </div>
  );
}

// ─── Animated Counter ────────────────────────────────────────

function StatNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl font-serif font-bold text-amber-400/90 tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-amber-800/50">{label}</p>
    </div>
  );
}

// ─── Feature Card ────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-amber-900/10 bg-gradient-to-b from-[#12100e] to-[#0c0a09] p-6 transition-all duration-500 hover:border-amber-700/25 hover:shadow-[0_8px_40px_rgba(201,166,107,0.08)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-950/40 border border-amber-800/15 mb-5 transition-all duration-300 group-hover:border-amber-700/30 group-hover:bg-amber-950/60 group-hover:shadow-[0_0_20px_rgba(201,166,107,0.1)]">
          <Icon className="h-5 w-5 text-amber-500/60 transition-colors duration-300 group-hover:text-amber-400/90" />
        </div>
        <h3 className="text-[15px] font-semibold text-foreground/90 mb-2 tracking-[-0.01em]">{title}</h3>
        <p className="text-[13px] text-amber-800/45 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── How It Works Step ───────────────────────────────────────

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative flex gap-5">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-700/25 bg-amber-950/50 text-sm font-serif font-bold text-amber-400/80">
          {number}
        </div>
        <div className="mt-2 w-px flex-1 bg-gradient-to-b from-amber-800/20 to-transparent" />
      </div>
      <div className="pb-10">
        <h3 className="text-[15px] font-semibold text-foreground/90 mb-1.5">{title}</h3>
        <p className="text-[13px] text-amber-800/45 leading-relaxed max-w-sm">{description}</p>
      </div>
    </div>
  );
}

// ─── Landing Page ────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Atmospheric gradients */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-amber-600/[0.05] rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-amber-800/[0.03] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-amber-900/[0.025] rounded-full blur-[120px]" />
      </div>

      <SprocketStrip />

      {/* ── Navigation ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-16 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_24px_rgba(201,166,107,0.2)]">
            <Lock className="h-4 w-4 text-amber-950" />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground/95">Nostalgia</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[13px] text-amber-800/50">
          <a href="#features" className="transition-colors hover:text-foreground/80">Features</a>
          <a href="#security" className="transition-colors hover:text-foreground/80">Security</a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground/80">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-800/60 hover:text-foreground hover:bg-white/[0.04] text-[13px]"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 hover:from-amber-300 hover:to-amber-500 shadow-[0_2px_12px_rgba(201,166,107,0.25)] text-[13px] font-semibold"
              >
                Get started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </Suspense>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10">
        <section className="px-6 pt-24 pb-20 lg:px-16 text-center">
          <div className="mx-auto max-w-4xl">
            {/* Badge */}
            <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-amber-800/20 bg-amber-950/25 px-5 py-2 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
              <span className="text-[11px] font-medium text-amber-700/70 tracking-wide">
                End-to-end encrypted · Open source
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[3.2rem] sm:text-[4.2rem] lg:text-[5.5rem] font-serif font-bold text-foreground tracking-[-0.03em] leading-[1.05]">
              Your memories,
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">preserved forever</span>
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-8 max-w-lg text-[15px] text-amber-800/50 leading-7">
              A private vault for your photos. Client-side encryption keeps them yours alone.
              AI rediscovery surfaces forgotten moments when you need them most.
            </p>

            {/* CTAs */}
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Suspense fallback={null}>
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 hover:from-amber-300 hover:to-amber-500 shadow-[0_4px_32px_rgba(201,166,107,0.3)] px-8 h-12 text-[14px] font-semibold rounded-xl"
                  >
                    Create your vault
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/[0.08] text-foreground/70 hover:border-white/[0.14] hover:text-foreground hover:bg-white/[0.03] h-12 text-[14px] rounded-xl"
                  >
                    Sign in
                  </Button>
                </Link>
              </Suspense>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex items-center justify-center gap-8 sm:gap-12">
              <StatNumber value="256" label="Bit encryption" />
              <div className="h-8 w-px bg-amber-900/15" />
              <StatNumber value="0" label="Data we see" />
              <div className="h-8 w-px bg-amber-900/15" />
              <StatNumber value="100%" label="Open source" />
            </div>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="mx-auto max-w-5xl px-6 lg:px-16">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-800/15 to-transparent" />
        </div>

        {/* ── Features ── */}
        <section id="features" className="px-6 py-24 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-amber-700/45 mb-4">
                Everything you need
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground/95 tracking-[-0.02em]">
                Built for permanence
              </h2>
              <p className="mt-4 mx-auto max-w-lg text-[14px] text-amber-800/45 leading-6">
                Every feature designed around one principle: your photos belong to you.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Lock}
                title="Client-side encryption"
                description="Photos encrypted in your browser before upload. We never see your content — not even thumbnails."
                delay={0}
              />
              <FeatureCard
                icon={Sparkles}
                title="AI intelligence"
                description="Smart captions, auto-tags, and semantic search. AI analyzes only thumbnails you explicitly allow."
                delay={80}
              />
              <FeatureCard
                icon={Search}
                title="Semantic search"
                description="Search your photos by describing what you remember. Find 'sunset at the beach' or 'birthday cake'."
                delay={160}
              />
              <FeatureCard
                icon={Heart}
                title="Nostalgia feed"
                description="Resurface forgotten moments — on this day, deep dives by year, and serendipitous rediscoveries."
                delay={240}
              />
              <FeatureCard
                icon={Share2}
                title="Share with intent"
                description="Share individual photos or create channels for family and friends. Control who sees what."
                delay={320}
              />
              <FeatureCard
                icon={MapPin}
                title="Map your life"
                description="Explore your memories geographically. See a living atlas of everywhere you've been."
                delay={400}
              />
            </div>
          </div>
        </section>

        {/* ── Zero-Knowledge ── */}
        <section id="security" className="px-6 py-24 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-3xl border border-amber-900/10 bg-gradient-to-br from-[#12100e] via-[#0e0c0a] to-[#0a0908]">
              <div className="grid gap-0 lg:grid-cols-2">
                {/* Left */}
                <div className="p-8 lg:p-14 border-b lg:border-b-0 lg:border-r border-white/[0.04]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-950/20 px-3 py-1 mb-6">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                    <span className="text-[11px] font-medium text-emerald-400/70">Zero-knowledge</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground/95 mb-5 leading-tight tracking-[-0.02em]">
                    Encryption that
                    <br />means something
                  </h2>
                  <p className="text-[14px] text-amber-800/45 leading-7 mb-8">
                    Your encryption key never leaves your device. Even if our servers were
                    compromised, your photos remain unreadable. Mathematically guaranteed.
                  </p>
                  <div className="space-y-3">
                    {[
                      "AES-256-GCM encryption for every photo",
                      "Key stored only in your browser's IndexedDB",
                      "PBKDF2-SHA-512 recovery bundle",
                      "Post-quantum ready symmetric scheme",
                      "Fully open source — audit the code yourself",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500/50 shrink-0" />
                        <span className="text-[13px] text-amber-800/50 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — key visualization */}
                <div className="flex items-center justify-center p-8 lg:p-14 bg-black/20">
                  <div className="w-full max-w-[300px]">
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0b0a] p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/50 border border-amber-800/20">
                          <Lock className="h-4 w-4 text-amber-500/70" />
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-foreground/80">Encryption Key</p>
                          <p className="text-[10px] text-amber-800/40">Stored locally · never transmitted</p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#080706] border border-white/[0.04] p-4">
                        <p className="font-mono text-[12px] text-amber-700/30 tracking-[0.15em] break-all leading-relaxed">
                          ••••••••••••••••••••
                          <br />
                          ••••••••••••••••••••
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500/60 animate-pulse" />
                          <span className="text-[11px] text-emerald-400/60 font-medium">Secured</span>
                        </div>
                        <span className="text-[11px] text-amber-800/35 font-mono">AES-256-GCM</span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {[88, 65, 94, 52, 78, 43].map((w, i) => (
                          <div key={i} className="h-[3px] rounded-full bg-white/[0.03] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-600/25 to-amber-500/40"
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

        {/* ── How It Works ── */}
        <section id="how-it-works" className="px-6 py-24 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-start">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-amber-700/45 mb-4">
                  Simple by design
                </p>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground/95 tracking-[-0.02em] mb-5">
                  Three steps to
                  <br />total privacy
                </h2>
                <p className="text-[14px] text-amber-800/45 leading-7 max-w-md">
                  No complicated setup. No keys to manage manually. Just upload and everything is encrypted, indexed, and searchable.
                </p>
              </div>
              <div className="space-y-0">
                <Step
                  number="1"
                  title="Create your vault"
                  description="Sign up with email or passkey. An encryption key is generated and stored only on your device."
                />
                <Step
                  number="2"
                  title="Upload your photos"
                  description="Drag and drop. Every photo is encrypted in your browser before it ever touches our servers."
                />
                <Step
                  number="3"
                  title="Rediscover and share"
                  description="AI surfaces forgotten moments. Share photos or albums with family — they see only what you choose."
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="px-6 py-24 lg:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-12 h-px max-w-xs bg-gradient-to-r from-transparent via-amber-800/15 to-transparent" />

            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground/95 tracking-[-0.02em] mb-5">
              Your memories deserve better
            </h2>
            <p className="mx-auto max-w-md text-[14px] text-amber-800/45 leading-7 mb-10">
              Free to use. Open source. No ads. No tracking.
              Your photos belong to you — always will.
            </p>
            <Suspense fallback={null}>
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 hover:from-amber-300 hover:to-amber-500 shadow-[0_4px_32px_rgba(201,166,107,0.3)] px-10 h-13 text-[15px] font-semibold rounded-xl"
                >
                  Create your vault
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Suspense>
          </div>
        </section>
      </main>

      <SprocketStrip />

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.04] bg-[#080706]">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-16">
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
                <Lock className="h-3 w-3 text-amber-950" />
              </div>
              <span className="text-[12px] text-amber-900/35">
                © 2026 Nostalgia
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-[12px] text-amber-900/35 transition-colors hover:text-amber-700/60">Features</a>
              <a href="#security" className="text-[12px] text-amber-900/35 transition-colors hover:text-amber-700/60">Security</a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-900/35 hover:text-amber-700/60 transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
