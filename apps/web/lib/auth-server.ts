import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

// Prefer public vars for the browser-facing app and fall back to server vars
// so local dev still works when only CONVEX_* values are present.
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  process.env.CONVEX_URL ??
  "https://placeholder.convex.cloud";
const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  process.env.CONVEX_SITE_URL ??
  "https://placeholder.convex.site";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl,
});
