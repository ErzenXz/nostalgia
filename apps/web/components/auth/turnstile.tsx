"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          action?: string;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

let scriptLoading: Promise<void> | null = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Turnstile script")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      // Wait a bit for turnstile to fully initialize
      const checkTurnstile = () => {
        if (window.turnstile) {
          resolve();
        } else {
          setTimeout(checkTurnstile, 50);
        }
      };
      checkTurnstile();
    };
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });

  return scriptLoading;
}

export function Turnstile({
  siteKey,
  onToken,
  action,
  theme = "auto",
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  action?: string;
  theme?: "light" | "dark" | "auto";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    // Bypass Turnstile entirely in local development
    if (isDev) {
      onToken("dev-bypass");
      return;
    }

    let cancelled = false;

    async function mount() {
      if (!containerRef.current) return;
      setError(null);
      onToken(null);

      try {
        await loadTurnstileScript();
        if (cancelled) return;
        if (!window.turnstile) {
          setError("Captcha failed to initialize.");
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          action,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            setError("Captcha error. Please retry.");
          },
        });
      } catch (e) {
        if (cancelled) return;
        onToken(null);
        setError(e instanceof Error ? e.message : "Captcha failed to load.");
      }
    }

    void mount();
    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
      widgetIdRef.current = null;
    };
  }, [action, isDev, onToken, siteKey, theme]);

  // Dev mode indicator
  if (isDev) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-secondary/50 border border-border px-3 py-2.5 shadow-sm">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="text-[12px] font-semibold text-foreground tracking-wide uppercase">
          Captcha bypassed · development
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 flex flex-col items-center justify-center pt-2">
      <div ref={containerRef} className="overflow-hidden rounded-lg" />
      {error ? (
        <p className="text-[13px] font-medium text-destructive">{error}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground font-medium">
          Protected by Cloudflare Turnstile.
        </p>
      )}
    </div>
  );
}

