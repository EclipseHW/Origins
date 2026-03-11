import { fetchQuery } from "convex/nextjs";
import { PublishedDecksBrowser } from "@/components/published-decks-browser";
import { api } from "@/convex/_generated/api";
import type { DeckRecord } from "@/lib/deck-types";

export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const params = await searchParams;
  let initialDecks: DeckRecord[] = [];

  if (params.deck) {
    const sharedDeck = await fetchQuery(api.decks.getPublishedById, {
      deckId: params.deck,
    });
    initialDecks = sharedDeck ? [sharedDeck] : [];
  } else {
    initialDecks = await fetchQuery(api.decks.listPublished, {});
  }

  return (
    <PublishedDecksBrowser
      initialDecks={initialDecks}
      sharedDeckId={params.deck ?? null}
    />
  );
}
