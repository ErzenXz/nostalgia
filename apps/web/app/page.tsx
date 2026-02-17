import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Shield,
  Image,
  Sparkles,
  MapPin,
  Heart,
  ArrowRight,
  Github,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-full blur-[150px] opacity-40" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px] opacity-30" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Lock className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-medium text-foreground">Nostalgia</span>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </Suspense>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 px-6 pt-16 pb-24 lg:px-12">
        <div className="mx-auto max-w-5xl">
          {/* Hero text */}
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              End-to-end encrypted photo storage
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your memories,{" "}
              <span className="text-primary">truly private</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              A secure home for your photos. Client-side encryption means only you
              can see them. Smart AI features help you rediscover moments that
              matter.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Suspense fallback={null}>
                <Link href="/register">
                  <Button size="lg" className="gap-2">
                    Start Protecting Memories
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </Suspense>
            </div>
          </div>

          {/* Feature grid */}
          <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Lock}
              title="Client-Side Encryption"
              description="Your photos are encrypted in your browser before upload. We never see your content."
            />
            <FeatureCard
              icon={Sparkles}
              title="AI Intelligence"
              description="Smart search, auto captions, and tags. AI analyzes only low-res thumbnails you allow."
            />
            <FeatureCard
              icon={MapPin}
              title="Map View"
              description="Explore your photos geographically. See where your memories were made."
            />
            <FeatureCard
              icon={Heart}
              title="Nostalgia Feed"
              description="Resurface forgotten moments. On this day, memories from years past."
            />
            <FeatureCard
              icon={Image}
              title="Beautiful Gallery"
              description="Clean, YouTube-like feed. Fast, responsive, and designed for your photos."
            />
            <FeatureCard
              icon={Shield}
              title="Passkeys & 2FA"
              description="Secure your account with modern authentication. Passkeys, TOTP, and more."
            />
          </div>

          {/* Security section */}
          <div className="mt-24 rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Zero-knowledge architecture
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Your encryption key never leaves your device. We store only a
                  cryptographic fingerprint to verify your key. Even if our
                  servers were compromised, your photos remain private.
                </p>
                <ul className="mt-6 space-y-3">
                  <SecurityItem>AES-256-GCM encryption for all photos</SecurityItem>
                  <SecurityItem>Key stored only in your browser&apos;s IndexedDB</SecurityItem>
                  <SecurityItem>Recovery bundle with PBKDF2-SHA-512 wrapping</SecurityItem>
                  <SecurityItem>Post-quantum ready symmetric encryption</SecurityItem>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl" />
                  <div className="relative rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/40">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Lock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Encryption Key
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stored locally
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground">
                      ••••••••••••••••••••••••••••••
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                      <Shield className="h-3.5 w-3.5" />
                      Never sent to server
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-24 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Ready to protect your memories?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands who trust Nostalgia with their most precious moments.
              Start free, upgrade when you need more.
            </p>
            <div className="mt-8">
              <Suspense fallback={null}>
                <Link href="/register">
                  <Button size="lg" className="gap-2">
                    Create Your Vault
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-12">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Lock className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">
                © 2026 Nostalgia. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
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

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 transition-all hover:border-primary/30 hover:bg-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/10">
        <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function SecurityItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </li>
  );
}
