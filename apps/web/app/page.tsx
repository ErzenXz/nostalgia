import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Sparkles,
  MapPin,
  Heart,
  ArrowRight,
  Github,
  Camera,
  Share2,
  Search,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

// ─── Animated Counter ────────────────────────────────────────

function StatNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
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
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-5 transition-all duration-300 group-hover:scale-110">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-[16px] font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-[14px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── How It Works Step ───────────────────────────────────────

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative flex gap-5">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold text-foreground">
          {number}
        </div>
        <div className="mt-2 w-px flex-1 bg-border" />
      </div>
      <div className="pb-10">
        <h3 className="text-[16px] font-semibold text-foreground mb-1.5">{title}</h3>
        <p className="text-[14px] text-muted-foreground leading-relaxed max-w-sm">{description}</p>
      </div>
    </div>
  );
}

// ─── Landing Page ────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* ── Navigation ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Lock className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-[18px] font-serif font-bold tracking-tight text-foreground">Nostalgia</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-muted-foreground">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#security" className="transition-colors hover:text-foreground">Security</a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Suspense fallback={null}>
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground hover:bg-muted text-[14px] font-medium hidden sm:flex"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-foreground text-background hover:bg-foreground/90 text-[14px] font-semibold rounded-full px-5"
              >
                Get started
              </Button>
            </Link>
          </Suspense>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10">
        <section className="px-6 pt-32 pb-20 lg:px-16 text-center">
          <div className="mx-auto max-w-4xl">
            {/* Badge */}
            <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-border bg-secondary/50 px-5 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] font-semibold text-foreground tracking-wide uppercase">
                End-to-end encrypted · Open source
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[3.5rem] sm:text-[4.5rem] lg:text-[6rem] font-serif font-bold text-foreground tracking-tight leading-[1.05]">
              Your memories,
              <br />
              <span className="text-primary">preserved forever</span>
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-8 max-w-xl text-[16px] sm:text-[18px] text-muted-foreground leading-relaxed">
              A private vault for your photos. Client-side encryption keeps them yours alone.
              AI rediscovery surfaces forgotten moments when you need them most.
            </p>

            {/* CTAs */}
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Suspense fallback={null}>
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:opacity-90 px-8 h-14 text-[15px] font-semibold rounded-full shadow-sm"
                  >
                    Create your vault
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-border text-foreground hover:bg-muted h-14 px-8 text-[15px] font-medium rounded-full"
                  >
                    Sign in
                  </Button>
                </Link>
              </Suspense>
            </div>

            {/* Trust indicators */}
            <div className="mt-20 flex items-center justify-center gap-8 sm:gap-16">
              <StatNumber value="256" label="Bit encryption" />
              <div className="h-10 w-px bg-border" />
              <StatNumber value="0" label="Data we see" />
              <div className="h-10 w-px bg-border" />
              <StatNumber value="100%" label="Open source" />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="px-6 py-24 lg:px-16 bg-muted/30 border-y border-border">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-primary mb-4">
                Everything you need
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
                Built for permanence
              </h2>
              <p className="mt-4 mx-auto max-w-lg text-[15px] text-muted-foreground leading-relaxed">
                Every feature designed around one principle: your photos belong to you.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="grid gap-0 lg:grid-cols-2">
                {/* Left */}
                <div className="p-8 lg:p-14 border-b lg:border-b-0 lg:border-r border-border">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 mb-6">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">Zero-knowledge</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-5 leading-tight">
                    Encryption that
                    <br />means something
                  </h2>
                  <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
                    Your encryption key never leaves your device. Even if our servers were
                    compromised, your photos remain unreadable. Mathematically guaranteed.
                  </p>
                  <div className="space-y-4">
                    {[
                      "AES-256-GCM encryption for every photo",
                      "Key stored only in your browser's IndexedDB",
                      "PBKDF2-SHA-512 recovery bundle",
                      "Post-quantum ready symmetric scheme",
                      "Fully open source — audit the code yourself",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-[14px] font-medium text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — key visualization */}
                <div className="flex items-center justify-center p-8 lg:p-14 bg-muted/30">
                  <div className="w-full max-w-[320px]">
                    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <Lock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-foreground">Encryption Key</p>
                          <p className="text-[12px] text-muted-foreground">Stored locally · never transmitted</p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-secondary border border-border p-4">
                        <p className="font-mono text-[14px] text-muted-foreground tracking-[0.2em] break-all leading-relaxed text-center">
                          ••••••••••••••••
                          <br />
                          ••••••••••••••••
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">Secured</span>
                        </div>
                        <span className="text-[12px] font-mono font-medium text-muted-foreground">AES-256-GCM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="px-6 py-24 lg:px-16 bg-muted/30 border-t border-border">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-primary mb-4">
                  Simple by design
                </p>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight mb-6">
                  Three steps to
                  <br />total privacy
                </h2>
                <p className="text-[16px] text-muted-foreground leading-relaxed max-w-md">
                  No complicated setup. No keys to manage manually. Just upload and everything is encrypted, indexed, and searchable.
                </p>
              </div>
              <div className="space-y-2 bg-background p-8 rounded-3xl border border-border shadow-sm">
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
        <section className="px-6 py-32 lg:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight mb-6">
              Your memories deserve better
            </h2>
            <p className="mx-auto max-w-lg text-[16px] text-muted-foreground leading-relaxed mb-10">
              Free to use. Open source. No ads. No tracking.
              Your photos belong to you — always will.
            </p>
            <Suspense fallback={null}>
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:opacity-90 px-10 h-14 text-[15px] font-semibold rounded-full shadow-md"
                >
                  Create your vault
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Suspense>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-16">
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Lock className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-[14px] font-medium text-muted-foreground">
                © 2026 Nostalgia
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#security" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">Security</a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
