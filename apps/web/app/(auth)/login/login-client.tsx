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
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  Github,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/feed";
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        ...(turnstileSiteKey
          ? { fetchOptions: { headers: { "x-captcha-response": captchaToken ?? "" } } }
          : {}),
      });
      const twoFactorRedirect = Boolean((result.data as any)?.twoFactorRedirect);
      if (result.error) {
        setError(result.error.message ?? "Sign in failed. Please try again.");
      } else if (twoFactorRedirect) {
        setStep("twoFactor");
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: twoFactorCode, trustDevice });
      if (result.error) {
        setError(result.error.message ?? "Verification failed. Please try again.");
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handlePasskey = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await authClient.signIn.passkey({ autoFill: false });
      if (result.error) {
        setError(result.error.message ?? "Passkey sign-in failed.");
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "twoFactor") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-serif font-bold text-foreground">Two-factor authentication</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Enter code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
            <p className="text-[13px] font-medium text-destructive text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleVerifyTwoFactor} className="space-y-5">
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="twoFactorCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              className="pl-11 h-12 text-lg tracking-[0.2em] text-center border-border bg-card focus:border-primary placeholder:text-muted-foreground/50"
              required
              autoFocus
            />
          </div>

          <label className="flex items-center justify-center gap-2 text-[13px] font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
            />
            Trust this device for 30 days
          </label>

          <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground hover:opacity-90 font-semibold text-[14px] rounded-lg transition-opacity" disabled={isLoading}>
            {isLoading ? "Verifying…" : "Verify code"}
            {!isLoading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </form>

        <button
          type="button"
          className="w-full text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => { setStep("credentials"); setTwoFactorCode(""); }}
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground tracking-tight">Welcome back</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Sign in to your intelligent photo library
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
          <p className="text-[13px] font-medium text-destructive text-center">{error}</p>
        </div>
      )}

      {/* Social / Passkey — compact icon row */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-12 border-border bg-background hover:bg-muted text-foreground font-medium text-[14px] flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm"
          onClick={() => handleSocial("google")}
          disabled={isLoading}
          title="Google"
        >
          {/* Google SVG */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="hidden sm:inline">Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 border-border bg-background hover:bg-muted text-foreground font-medium text-[14px] flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm"
          onClick={() => handleSocial("github")}
          disabled={isLoading}
          title="GitHub"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">GitHub</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 border-border bg-background hover:bg-muted text-foreground font-medium text-[14px] flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm"
          onClick={handlePasskey}
          disabled={isLoading}
          title="Passkey"
        >
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline">Passkey</span>
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 py-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email / Password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-12 h-12 rounded-xl border-border bg-background focus:border-primary placeholder:text-muted-foreground/50 text-[15px]"
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-12 pr-12 h-12 rounded-xl border-border bg-background focus:border-primary placeholder:text-muted-foreground/50 text-[15px]"
            required
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-primary text-primary-foreground hover:opacity-90 font-semibold text-[15px] rounded-xl transition-opacity mt-4 shadow-md"
          disabled={isLoading || (Boolean(turnstileSiteKey) && !captchaToken)}
        >
          {isLoading ? "Signing in…" : "Sign In"}
          {!isLoading && <ArrowRight className="h-5 w-5 ml-2" />}
        </Button>
      </form>

      {/* Captcha */}
      {turnstileSiteKey && (
        <Turnstile siteKey={turnstileSiteKey} onToken={setCaptchaToken} action="login" />
      )}

      {/* Footer */}
      <p className="text-center text-[14px] text-muted-foreground mt-8">
        Don't have an account?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline transition-all">
          Sign up
        </Link>
      </p>
    </div>
  );
}
