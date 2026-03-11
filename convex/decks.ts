import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { normalizeDeckRecord } from "../lib/deck-types";

function getPublisherUsername(identity: Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>) {
  if (!identity) {
    return null;
  }

  return (
    identity.preferredUsername ??
    identity.nickname ??
    identity.email?.split("@")[0] ??
    null
  );
}

function getPublisherName(identity: Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>) {
  if (!identity) {
    return null;
  }

  return (
    identity.name ??
    identity.givenName ??
    getPublisherUsername(identity) ??
    null
  );
}

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  return identity;
}

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);
  return identity.subject;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const decks = await ctx.db
      .query("decks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return decks
      .map((deck) => normalizeDeckRecord(deck))
      .sort((left, right) => right.updatedAt - left.updatedAt);
  },
});

export const create = mutation({
  args: {
    deckName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const timestamp = Date.now();
    const deckId = await ctx.db.insert("decks", {
      userId,
      deckName: args.deckName,
      legendarySlug: null,
      cardSlugs: [],
      archetype: null,
      publisherName: null,
      publisherUsername: null,
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return deckId;
  },
});

export const update = mutation({
  args: {
    deckId: v.id("decks"),
    deckName: v.string(),
    legendarySlug: v.union(v.string(), v.null()),
    cardSlugs: v.array(v.string()),
    archetype: v.union(
      v.literal("Aggro"),
      v.literal("Midrange"),
      v.literal("Combo"),
      v.literal("Control"),
      v.null(),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const deck = await ctx.db.get(args.deckId);

    if (!deck || deck.userId !== userId) {
      throw new Error("Deck not found");
    }

    await ctx.db.patch(args.deckId, {
      deckName: args.deckName,
      legendarySlug: args.legendarySlug,
      cardSlugs: args.cardSlugs,
      archetype: args.archetype,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    deckId: v.id("decks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const deck = await ctx.db.get(args.deckId);

    if (!deck || deck.userId !== userId) {
      throw new Error("Deck not found");
    }

    await ctx.db.delete(args.deckId);
  },
});

export const publish = mutation({
  args: {
    deckId: v.id("decks"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const userId = identity.subject;
    const deck = await ctx.db.get(args.deckId);

    if (!deck || deck.userId !== userId) {
      throw new Error("Deck not found");
    }

    const timestamp = Date.now();

    await ctx.db.patch(args.deckId, {
      publishedAt: timestamp,
      publisherName: getPublisherName(identity),
      publisherUsername: getPublisherUsername(identity),
      updatedAt: timestamp,
    });
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const decks = await ctx.db.query("decks").collect();

    return decks
      .map((deck) => normalizeDeckRecord(deck))
      .filter((deck) => deck.publishedAt !== null)
      .sort(
        (left, right) => (right.publishedAt ?? 0) - (left.publishedAt ?? 0),
      );
  },
});
