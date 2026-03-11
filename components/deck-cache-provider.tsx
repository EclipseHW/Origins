"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { normalizeDeckRecord, type DeckRecord } from "@/lib/deck-types";

type DeckCacheContextValue = {
  decksByUserId: Record<string, DeckRecord[]>;
  setCachedDecks: (userId: string, decks: DeckRecord[]) => void;
};

const DeckCacheContext = createContext<DeckCacheContextValue | null>(null);

function cloneDeck(deck: DeckRecord): DeckRecord {
  return normalizeDeckRecord(deck);
}

function decksMatch(left: DeckRecord[], right: DeckRecord[]) {
  return (
    left.length === right.length &&
    left.every((leftDeck, index) => {
      const rightDeck = right[index];

      return (
        leftDeck._id === rightDeck?._id &&
        leftDeck.deckName === rightDeck.deckName &&
        leftDeck.legendarySlug === rightDeck.legendarySlug &&
        leftDeck.archetype === rightDeck?.archetype &&
        leftDeck.publisherName === rightDeck?.publisherName &&
        leftDeck.publisherUsername === rightDeck?.publisherUsername &&
        leftDeck.publishedAt === rightDeck.publishedAt &&
        leftDeck.createdAt === rightDeck.createdAt &&
        leftDeck.updatedAt === rightDeck.updatedAt &&
        leftDeck.cardSlugs.length === rightDeck.cardSlugs.length &&
        leftDeck.cardSlugs.every((slug, slugIndex) => slug === rightDeck.cardSlugs[slugIndex])
      );
    })
  );
}

export function DeckCacheProvider({ children }: { children: ReactNode }) {
  const [decksByUserId, setDecksByUserId] = useState<Record<string, DeckRecord[]>>(
    {},
  );

  const setCachedDecks = useCallback((userId: string, decks: DeckRecord[]) => {
    setDecksByUserId((current) => {
      const nextDecks = decks.map(cloneDeck);
      const existingDecks = current[userId];

      if (existingDecks && decksMatch(existingDecks, nextDecks)) {
        return current;
      }

      return {
        ...current,
        [userId]: nextDecks,
      };
    });
  }, []);

  const value = useMemo<DeckCacheContextValue>(
    () => ({
      decksByUserId,
      setCachedDecks,
    }),
    [decksByUserId, setCachedDecks],
  );

  return (
    <DeckCacheContext.Provider value={value}>
      {children}
    </DeckCacheContext.Provider>
  );
}

export function useDeckCache() {
  const context = useContext(DeckCacheContext);
  if (!context) {
    throw new Error("useDeckCache must be used within a DeckCacheProvider");
  }

  return context;
}
