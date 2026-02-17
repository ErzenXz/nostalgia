import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { AuthClient as ConvexAuthClient } from "@convex-dev/better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import {
  deviceAuthorizationClient,
  lastLoginMethodClient,
  twoFactorClient,
} from "better-auth/client/plugins";

// NOTE: We intentionally keep the exported types here simple because our
// workspace TS config enables declarations. Better Auth client types are
// very deep and can become non-portable under pnpm's node_modules layout.
type AuthClient = ConvexAuthClient & {
  signIn: any;
  signUp: any;
  signOut: any;
  useSession: any;
  twoFactor: any;
  passkey: any;
  device: any;
  getLastUsedLoginMethod: () => string | null;
  clearLastUsedLoginMethod: () => void;
  isLastUsedLoginMethod: (method: string) => boolean;
  useListPasskeys: any;
} & Record<string, any>;

export const authClient: AuthClient = createAuthClient({
  plugins: [
    convexClient(),
    passkeyClient(),
    twoFactorClient(),
    lastLoginMethodClient(),
    deviceAuthorizationClient(),
  ],
}) as unknown as AuthClient;

export const signIn: AuthClient["signIn"] = authClient.signIn;
export const signUp: AuthClient["signUp"] = authClient.signUp;
export const signOut: AuthClient["signOut"] = authClient.signOut;
export const useSession: AuthClient["useSession"] = authClient.useSession;
