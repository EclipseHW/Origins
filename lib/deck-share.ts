import { cardsBySlug, type CardDefinition } from "@/lib/cards";
import type { DeckRecord } from "@/lib/deck-types";
import { getAbsoluteSiteUrl } from "@/lib/site-url";

type DeckShareCard = {
  slug: string;
  card: CardDefinition | null;
  isLegendary: boolean;
};

export function formatDeckPublisherHandle(deck: DeckRecord) {
  return deck.publisherName ?? deck.publisherUsername ?? "Unknown";
}

export function formatDeckPublishedAt(timestamp: number | null) {
  if (!timestamp) {
    return "Unpublished";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

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

export function getDeckShareDescription(deck: DeckRecord): string {
  const legendaryName = deck.legendarySlug
    ? cardsBySlug[deck.legendarySlug]?.name ?? null
    : null;

  return [
    deck.archetype,
    legendaryName ? `Legendary: ${legendaryName}` : null,
    `Published by ${formatDeckPublisherHandle(deck)}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function getDeckShareMetaParts(deck: DeckRecord): string[] {
  return [
    `Published by ${formatDeckPublisherHandle(deck)}`,
    formatDeckPublishedAt(deck.publishedAt),
    deck.archetype,
  ].filter((part): part is string => Boolean(part));
}

export function getDeckShareImageUrl(deckId: string): string {
  return getAbsoluteSiteUrl(`/api/og/deck?deck=${encodeURIComponent(deckId)}`);
}
