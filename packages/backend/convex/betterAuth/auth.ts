import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import { passkey } from "@better-auth/passkey";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import {
  captcha,
  deviceAuthorization,
  haveIBeenPwned,
  lastLoginMethod,
  twoFactor,
} from "better-auth/plugins";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

// Better Auth Component
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  },
);

// Better Auth Options
export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  // IMPORTANT: Don't throw when this is missing.
  // Convex deploy evaluates modules during push, and env may not be fully set in CI.
  // Better Auth will warn if baseURL is not valid for callbacks; the app should
  // still be deployable.
  const baseURL =
    process.env.BETTER_AUTH_URL ??
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const passkeyRpId =
    process.env.PASSKEY_RP_ID ?? new URL(baseURL).hostname ?? "localhost";

  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;

  return {
    appName: "Nostalgia",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
            },
          }
        : {}),
    },
    plugins: [
      convex({ authConfig }),
      passkey({
        rpID: passkeyRpId,
        rpName: "Nostalgia",
      }),
      twoFactor({
        issuer: "Nostalgia",
        totpOptions: {
          digits: 6,
          period: 30,
        },
      }),
      lastLoginMethod({
        storeInDatabase: true,
      }),
      haveIBeenPwned(),
      ...(turnstileSecretKey
        ? [
            captcha({
              provider: "cloudflare-turnstile",
              secretKey: turnstileSecretKey,
              // Only require captcha on high-risk entrypoints by default.
              endpoints: ["/sign-in/email", "/sign-up/email"],
            }),
          ]
        : []),
      deviceAuthorization({
        verificationUri: "/device",
      }),
    ],
  } satisfies BetterAuthOptions;
};

// For `@better-auth/cli`
export const options = createAuthOptions({} as GenericCtx<DataModel>);

// Better Auth Instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
