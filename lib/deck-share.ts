import { cardsBySlug, type CardDefinition } from "@/lib/cards";
import type { DeckRecord } from "@/lib/deck-types";
import { getAbsoluteSiteUrl } from "@/lib/site-url";

export const DECK_SHARE_IMAGE_SIZE = {
  width: 1200,
  height: 496,
} as const;

type DeckShareCard = {
  slug: string;
  card: CardDefinition | null;
  isLegendary: boolean;
};

export function getDeckShareCards(deck: DeckRecord): DeckShareCard[] {
  const legendaryCard = deck.legendarySlug
    ? cardsBySlug[deck.legendarySlug] ?? null
    : null;
  const deckCards = deck.cardSlugs
    .map((slug) => cardsBySlug[slug] ?? null)
    .filter((card): card is CardDefinition => Boolean(card));

  return [
    {
      slug: deck.legendarySlug ?? "__legendary__",
      card: legendaryCard,
      isLegendary: true,
    },
    ...deckCards.map((card) => ({
      slug: card.slug,
      card,
      isLegendary: false,
    })),
  ];
}

export function getDeckShareTitle(deck: DeckRecord): string {
  return `${deck.deckName || "Untitled Deck"} | Origins Base`;
}

export function getDeckShareImageUrl(deckId: string): string {
  return getAbsoluteSiteUrl(`/api/og/deck?deck=${encodeURIComponent(deckId)}`);
}
