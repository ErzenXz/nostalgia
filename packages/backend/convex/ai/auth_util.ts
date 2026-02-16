import { ConvexError } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * Resolve the current authenticated user to a Convex `users` document id.
 *
 * This uses Better Auth via Convex auth identity. The Convex `subject` is the
 * Better Auth user id, which we map to `users.betterAuthUserId`.
 */
export async function getAuthedUserId(ctx: any): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const betterAuthUserId = identity.subject;

  // Works in both queries/mutations (ctx.db) and actions (ctx.runQuery).
  // Works in both queries/mutations (ctx.db) and actions (ctx.runQuery).
  let user: any = null;
  if (ctx.db) {
    user = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q: any) =>
        q.eq("betterAuthUserId", betterAuthUserId),
      )
      .unique();
  } else {
    user = await ctx.runQuery(api.users.getByBetterAuthId, { betterAuthUserId });
  }

  if (!user) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "User record not found",
    });
  }

  return user._id as Id<"users">;
}
