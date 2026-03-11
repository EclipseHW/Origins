import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  decks: defineTable({
    userId: v.string(),
    deckName: v.string(),
    legendarySlug: v.union(v.string(), v.null()),
    cardSlugs: v.array(v.string()),
    deckFingerprint: v.optional(v.union(v.string(), v.null())),
    archetype: v.optional(
      v.union(
        v.literal("Aggro"),
        v.literal("Midrange"),
        v.literal("Combo"),
        v.literal("Control"),
        v.null(),
      ),
    ),
    publisherName: v.optional(v.union(v.string(), v.null())),
    publisherUsername: v.optional(v.union(v.string(), v.null())),
    publishedAt: v.optional(v.union(v.number(), v.null())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_deckFingerprint", ["deckFingerprint"])
    .index("by_publishedAt", ["publishedAt"]),
});
