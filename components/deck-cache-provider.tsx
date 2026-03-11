"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { normalizeDeckRecord, type DeckRecord } from "@/lib/deck-types";

type DeckCacheContextValue = {
  decksByUserId: Record<string, DeckRecord[]>;
  cacheHydrated: boolean;
  setCachedDecks: (userId: string, decks: DeckRecord[]) => void;
};

const DeckCacheContext = createContext<DeckCacheContextValue | null>(null);
const DECK_CACHE_STORAGE_KEY = "origins:deck-cache:v1";

function cloneDeck(deck: DeckRecord): DeckRecord {
  return normalizeDeckRecord(deck);
}

function readPersistedDecks(): Record<string, DeckRecord[]> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(DECK_CACHE_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).flatMap(([userId, decks]) => {
        if (!Array.isArray(decks)) {
          return [];
        }

        return [
          [
            userId,
            decks
              .filter((deck): deck is DeckRecord => Boolean(deck))
              .map((deck) => cloneDeck(deck)),
          ],
        ];
      }),
    );
  } catch {
    return {};
  }
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
    () => readPersistedDecks(),
  );
  const [cacheHydrated] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    if (!cacheHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      DECK_CACHE_STORAGE_KEY,
      JSON.stringify(decksByUserId),
    );
  }, [cacheHydrated, decksByUserId]);

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
      cacheHydrated,
      setCachedDecks,
    }),
    [cacheHydrated, decksByUserId, setCachedDecks],
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
