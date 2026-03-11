import type { DeckArchetype } from "@/lib/deck-archetypes";

export type DeckDraft = {
  deckName: string;
  legendarySlug: string | null;
  cardSlugs: string[];
  archetype: DeckArchetype | null;
};

export type DeckRecord = DeckDraft & {
  _id: string;
  userId?: string;
  publisherName?: string | null;
  publisherUsername?: string | null;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

type NormalizableDeckRecord = Omit<
  DeckRecord,
  "archetype" | "publisherName" | "publisherUsername" | "publishedAt"
> &
  Partial<
    Pick<
      DeckRecord,
      "archetype" | "publisherName" | "publisherUsername" | "publishedAt"
    >
  >;

export function normalizeDeckRecord(deck: NormalizableDeckRecord): DeckRecord {
  return {
    ...deck,
    archetype: deck.archetype ?? null,
    publisherName: deck.publisherName ?? null,
    publisherUsername: deck.publisherUsername ?? null,
    publishedAt: deck.publishedAt ?? null,
    cardSlugs: [...deck.cardSlugs],
  };
}
