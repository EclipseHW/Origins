import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { PublishedDecksBrowser } from "@/components/published-decks-browser";
import { api } from "@/convex/_generated/api";
import {
  getDeckShareDescription,
  getDeckShareImageUrl,
  getDeckShareTitle,
} from "@/lib/deck-share";
import type { DeckRecord } from "@/lib/deck-types";
import { getPublishedDeckByParam } from "@/lib/published-decks";

type DecksSearchParams = Promise<{ deck?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: DecksSearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const sharedDeck = await getPublishedDeckByParam(params.deck);

  if (!sharedDeck) {
    return {
      title: "Decks | Origins Base",
      description: "Explore published Origins decks, copy codes, and open them in the builder.",
    };
  }

  const imageUrl = getDeckShareImageUrl(sharedDeck._id);
  const title = getDeckShareTitle(sharedDeck);
  const description = getDeckShareDescription(sharedDeck);
  const url = `/decks?deck=${encodeURIComponent(sharedDeck._id)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${sharedDeck.deckName || "Untitled Deck"} deck preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function DecksPage({
  searchParams,
}: {
  searchParams: DecksSearchParams;
}) {
  const params = await searchParams;
  let initialDecks: DeckRecord[] = [];

  if (params.deck) {
    const sharedDeck = await getPublishedDeckByParam(params.deck);
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
