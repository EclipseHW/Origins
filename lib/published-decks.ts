import { cache } from "react";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { DeckRecord } from "@/lib/deck-types";

export const getPublishedDeckById = cache(
  async (deckId: string): Promise<DeckRecord | null> => {
    return fetchQuery(api.decks.getPublishedById, { deckId });
  },
);

export async function getPublishedDeckByParam(
  deckId: string | null | undefined,
): Promise<DeckRecord | null> {
  if (!deckId) {
    return null;
  }

  return getPublishedDeckById(deckId);
}
