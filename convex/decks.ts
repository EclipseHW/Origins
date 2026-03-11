import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { normalizeDeckRecord } from "../lib/deck-types";
import { getDeckFingerprint } from "../lib/deck-fingerprint";

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

async function getPublishedDecksByFingerprint(
  ctx: QueryCtx | MutationCtx,
  deckFingerprint: string,
) {
  const decks = await ctx.db
    .query("decks")
    .withIndex("by_deckFingerprint", (q) =>
      q.eq("deckFingerprint", deckFingerprint),
    )
    .collect();

  return decks.filter((deck) => deck.publishedAt != null);
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
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
      deckFingerprint: null,
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

    const deckFingerprint = getDeckFingerprint(
      args.legendarySlug,
      args.cardSlugs,
    );

    await ctx.db.patch(args.deckId, {
      deckName: args.deckName,
      legendarySlug: args.legendarySlug,
      cardSlugs: args.cardSlugs,
      deckFingerprint,
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

        if (!deck.legendarySlug || deck.cardSlugs.length !== 12) {
          throw new Error("Only full decks with a legendary and 12 cards can be published");
        }

        const deckFingerprint =
          deck.deckFingerprint ??
          getDeckFingerprint(deck.legendarySlug, deck.cardSlugs);

        if (!deckFingerprint) {
          throw new Error("Only full decks with a legendary and 12 cards can be published");
        }

        const duplicatePublishedDeck = (
          await getPublishedDecksByFingerprint(ctx, deckFingerprint)
        ).find((publishedDeck) => publishedDeck._id !== args.deckId);

        if (duplicatePublishedDeck) {
          throw new Error("An identical published deck already exists");
        }

	    const timestamp = Date.now();

    await ctx.db.patch(args.deckId, {
      deckFingerprint,
      publishedAt: timestamp,
      publisherName: getPublisherName(identity),
      publisherUsername: getPublisherUsername(identity),
      updatedAt: timestamp,
    });
  },
});

export const unpublish = mutation({
  args: {
    deckId: v.id("decks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const deck = await ctx.db.get(args.deckId);

    if (!deck || deck.userId !== userId) {
      throw new Error("Deck not found");
    }

    await ctx.db.patch(args.deckId, {
      publishedAt: null,
      publisherName: null,
      publisherUsername: null,
      updatedAt: Date.now(),
    });
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const decks = await ctx.db
      .query("decks")
      .withIndex("by_publishedAt", (q) => q.gt("publishedAt", 0))
      .order("desc")
      .collect();

    return decks
      .map((deck) => normalizeDeckRecord(deck))
      .filter((deck) => deck.publishedAt !== null);
  },
});

export const hasPublishedDuplicate = query({
  args: {
    deckFingerprint: v.string(),
    excludeDeckId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const excludedDeckId = args.excludeDeckId
      ? ctx.db.normalizeId("decks", args.excludeDeckId)
      : null;
    const decks = await getPublishedDecksByFingerprint(ctx, args.deckFingerprint);

    return decks.some((deck) => deck._id !== excludedDeckId);
  },
});

export const getPublishedById = query({
  args: {
    deckId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedId = ctx.db.normalizeId("decks", args.deckId);

    if (!normalizedId) {
      return null;
    }

    const deck = await ctx.db.get(normalizedId);

    if (!deck) {
      return null;
    }

    const normalizedDeck = normalizeDeckRecord(deck);

    if (normalizedDeck.publishedAt === null) {
      return null;
    }

    return normalizedDeck;
  },
});
