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

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/photos";
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
          ? {
              fetchOptions: {
                headers: {
                  "x-captcha-response": captchaToken ?? "",
                },
              },
            }
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
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: twoFactorCode,
        trustDevice,
      });

      if (result.error) {
        setError(
          result.error.message ?? "Verification failed. Please try again.",
        );
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocial = async (provider: "google" | "github") => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await authClient.signIn.social({ provider });
      if (result.error) {
        setError(result.error.message ?? "Sign in failed. Please try again.");
      }
      // On success this usually redirects away.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
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
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Lock className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your Nostalgia account
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Social / Passkey */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center gap-2"
          onClick={() => handleSocial("google")}
          disabled={isLoading}
        >
          <span className="text-sm font-medium">Continue with Google</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center gap-2"
          onClick={() => handleSocial("github")}
          disabled={isLoading}
        >
          <Github className="h-4 w-4" />
          <span className="text-sm font-medium">Continue with GitHub</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center gap-2"
          onClick={handlePasskey}
          disabled={isLoading}
        >
          <KeyRound className="h-4 w-4" />
          <span className="text-sm font-medium">Continue with Passkey</span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Form */}
      {step === "credentials" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || (Boolean(turnstileSiteKey) && !captchaToken)}
          >
            {isLoading ? "Signing in..." : "Sign In"}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
          <div className="rounded-lg border border-border bg-card/50 p-3">
            <p className="text-sm text-foreground text-center font-medium">
              Two-factor verification
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Enter the code from your authenticator app.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="twoFactorCode"
              className="text-sm font-medium text-foreground"
            >
              Authentication code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="twoFactorCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
            />
            Trust this device for 30 days
          </label>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify"}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setStep("credentials");
              setTwoFactorCode("");
            }}
            disabled={isLoading}
          >
            Back
          </Button>
        </form>
      )}

      {/* Captcha */}
      {turnstileSiteKey && step === "credentials" ? (
        <Turnstile
          siteKey={turnstileSiteKey}
          onToken={setCaptchaToken}
          action="login"
        />
      ) : null}

      {/* Footer */}
      {step === "credentials" ? (
        <>
          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-foreground hover:underline"
            >
              Sign up
            </Link>
          </div>

          {/* Security notice */}
          <div className="rounded-lg border border-border bg-card/50 p-3">
            <p className="text-xs text-muted-foreground text-center">
              Your photos are end-to-end encrypted. We can never see your
              content.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
