"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/auth/turnstile";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Github,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function RegisterClient() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/photos";
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSocial = async (provider: "google" | "github") => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await authClient.signIn.social({ provider });
      if (result.error) setError(result.error.message ?? "Sign in failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
        ...(turnstileSiteKey
          ? { fetchOptions: { headers: { "x-captcha-response": captchaToken ?? "" } } }
          : {}),
      });
      if (result.error) {
        setError(result.error.message ?? "Registration failed. Please try again.");
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-heading font-semibold text-foreground/95">Create vault</h1>
        <p className="mt-0.5 text-[10px] font-mono text-amber-800/50 uppercase tracking-wider">
          Your encrypted photo archive
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-900/30 bg-red-950/20 px-3 py-2">
          <p className="text-xs text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Social — compact icon row */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-amber-900/25 bg-[#0c0b0a] hover:border-amber-700/40 hover:bg-amber-950/30 text-amber-800/60 hover:text-amber-400 h-10 justify-center gap-2 text-[10px] font-mono uppercase tracking-wider"
          onClick={() => handleSocial("google")}
          disabled={isLoading}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-amber-900/25 bg-[#0c0b0a] hover:border-amber-700/40 hover:bg-amber-950/30 text-amber-800/60 hover:text-amber-400 h-10 justify-center gap-2 text-[10px] font-mono uppercase tracking-wider"
          onClick={() => handleSocial("github")}
          disabled={isLoading}
        >
          <Github className="h-4 w-4 shrink-0" />
          Continue with GitHub
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-amber-900/15" />
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-900/40">or</span>
        <div className="h-px flex-1 bg-amber-900/15" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-800/35 pointer-events-none" />
          <Input
            id="name"
            type="text"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-9 border-amber-900/22 bg-[#0c0b0a] focus:border-amber-700/40 placeholder:text-amber-900/30 text-sm"
            required
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-800/35 pointer-events-none" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 border-amber-900/22 bg-[#0c0b0a] focus:border-amber-700/40 placeholder:text-amber-900/30 text-sm"
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-800/35 pointer-events-none" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9 pr-9 border-amber-900/22 bg-[#0c0b0a] focus:border-amber-700/40 placeholder:text-amber-900/30 text-sm"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-800/35 hover:text-amber-600/60 transition-colors"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500 shadow-[0_2px_8px_rgba(201,166,107,0.25)] font-mono uppercase tracking-wider"
          disabled={isLoading || (Boolean(turnstileSiteKey) && !captchaToken)}
        >
          {isLoading ? "Creating vault…" : "Create Vault"}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      {/* Captcha */}
      {turnstileSiteKey && (
        <Turnstile siteKey={turnstileSiteKey} onToken={setCaptchaToken} action="register" />
      )}

      {/* Footer */}
      <p className="text-center text-[11px] font-mono text-amber-900/40">
        Already have a vault?{" "}
        <Link href="/login" className="text-amber-700/60 hover:text-amber-500/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
