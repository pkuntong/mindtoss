import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const toSafeUser = (user: {
  _id: string;
  email: string;
  userMetadataJson?: string;
}) => ({
  id: user._id,
  email: user.email,
  user_metadata: user.userMetadataJson ? JSON.parse(user.userMetadataJson) : {},
});

const getUserByToken = async (ctx: any, token: string) => {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();

  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    await ctx.db.delete(session._id);
    return null;
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    await ctx.db.delete(session._id);
    return null;
  }

  return { session, user };
};

export const signUp = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email,
      passwordHash: args.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    const token = crypto.randomUUID();
    await ctx.db.insert("sessions", {
      token,
      userId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    return {
      user: {
        id: userId,
        email,
        user_metadata: {},
      },
      sessionToken: token,
    };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user || !user.passwordHash || user.passwordHash !== args.passwordHash) {
      throw new Error("Invalid email or password.");
    }

    const now = Date.now();
    const token = crypto.randomUUID();
    await ctx.db.insert("sessions", {
      token,
      userId: user._id,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    return {
      user: toSafeUser({
        _id: user._id,
        email: user.email,
        userMetadataJson: user.userMetadataJson,
      }),
      sessionToken: token,
    };
  },
});

export const signInWithApple = mutation({
  args: {
    appleUserId: v.string(),
    email: v.optional(v.string()),
    givenName: v.optional(v.string()),
    familyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedEmail = args.email?.trim().toLowerCase();

    let user = await ctx.db
      .query("users")
      .withIndex("by_apple_user_id", (q) => q.eq("appleUserId", args.appleUserId))
      .unique();

    if (!user && normalizedEmail) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique();
    }

    const fullName = [args.givenName, args.familyName].filter(Boolean).join(" ").trim();
    const userMetadata = {
      full_name: fullName || undefined,
      given_name: args.givenName || undefined,
      family_name: args.familyName || undefined,
    };

    if (!user) {
      const fallbackEmail = normalizedEmail || `apple-${args.appleUserId}@mindtoss.local`;
      const userId = await ctx.db.insert("users", {
        email: fallbackEmail,
        appleUserId: args.appleUserId,
        userMetadataJson: JSON.stringify(userMetadata),
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    } else {
      await ctx.db.patch(user._id, {
        appleUserId: user.appleUserId || args.appleUserId,
        email: normalizedEmail || user.email,
        userMetadataJson: JSON.stringify({
          ...(user.userMetadataJson ? JSON.parse(user.userMetadataJson) : {}),
          ...userMetadata,
        }),
        updatedAt: now,
      });
      user = await ctx.db.get(user._id);
    }

    if (!user) {
      throw new Error("Failed to complete Apple sign in.");
    }

    const token = crypto.randomUUID();
    await ctx.db.insert("sessions", {
      token,
      userId: user._id,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    return {
      user: toSafeUser({
        _id: user._id,
        email: user.email,
        userMetadataJson: user.userMetadataJson,
      }),
      sessionToken: token,
    };
  },
});

export const getSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const auth = await getUserByToken(ctx, args.token);
    if (!auth) {
      return null;
    }

    return {
      user: toSafeUser({
        _id: auth.user._id,
        email: auth.user.email,
        userMetadataJson: auth.user.userMetadataJson,
      }),
      expiresAt: auth.session.expiresAt,
    };
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

export const deleteAccount = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const auth = await getUserByToken(ctx, args.token);
    if (!auth) {
      throw new Error("Unauthorized.");
    }

    const userState = await ctx.db
      .query("userStates")
      .withIndex("by_user_id", (q) => q.eq("userId", auth.user._id))
      .unique();

    if (userState) {
      await ctx.db.delete(userState._id);
    }

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_id", (q) => q.eq("userId", auth.user._id))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(auth.user._id);

    return { success: true };
  },
});

export const getState = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const auth = await getUserByToken(ctx, args.token);
    if (!auth) {
      throw new Error("Unauthorized.");
    }

    const state = await ctx.db
      .query("userStates")
      .withIndex("by_user_id", (q) => q.eq("userId", auth.user._id))
      .unique();

    if (!state) {
      return null;
    }

    return {
      emailAccountsJson: state.emailAccountsJson,
      historyJson: state.historyJson,
      userProfileJson: state.userProfileJson,
      categoriesJson: state.categoriesJson,
      darkMode: state.darkMode,
      updatedAt: state.updatedAt,
    };
  },
});

export const saveState = mutation({
  args: {
    token: v.string(),
    emailAccountsJson: v.string(),
    historyJson: v.string(),
    userProfileJson: v.string(),
    categoriesJson: v.string(),
    darkMode: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await getUserByToken(ctx, args.token);
    if (!auth) {
      throw new Error("Unauthorized.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("userStates")
      .withIndex("by_user_id", (q) => q.eq("userId", auth.user._id))
      .unique();

    const payload = {
      userId: auth.user._id,
      emailAccountsJson: args.emailAccountsJson,
      historyJson: args.historyJson,
      userProfileJson: args.userProfileJson,
      categoriesJson: args.categoriesJson,
      darkMode: args.darkMode,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("userStates", payload);
    }

    return { success: true };
  },
});
