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
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Turnstile script")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
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

  useEffect(() => {
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
  }, [action, onToken, siteKey, theme]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} />
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Protected by Cloudflare Turnstile.
        </p>
      )}
    </div>
  );
}

