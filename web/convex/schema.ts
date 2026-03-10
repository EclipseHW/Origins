import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  decks: defineTable({
    userId: v.string(),
    deckName: v.string(),
    legendarySlug: v.union(v.string(), v.null()),
    cardSlugs: v.array(v.string()),
    publishedAt: v.union(v.number(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),
});
