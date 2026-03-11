"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Check, Copy, Hammer, Share2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cardsBySlug, type CardDefinition } from "@/lib/cards";
import { encodeExternalDeckCode, encodeLocalDeckCode } from "@/lib/deck-code";
import { DECK_ARCHETYPE_OPTIONS } from "@/lib/deck-archetypes";
import { normalizeDeckRecord, type DeckRecord } from "@/lib/deck-types";

const listPublishedDecksReference = makeFunctionReference<
  "query",
  Record<string, never>,
  DeckRecord[]
>("decks:listPublished");

const actionButtonClass =
  "inline-flex h-6 w-6 items-center justify-center rounded-full text-white/32 transition hover:bg-white/8 hover:text-white/70";
const PENDING_BUILDER_IMPORT_STORAGE_KEY = "origins:pending-builder-import";

function formatPublisherHandle(deck: DeckRecord) {
  return deck.publisherName ?? deck.publisherUsername ?? "Unknown";
}

function formatPublishedAt(timestamp: number | null) {
  if (!timestamp) {
    return "Unpublished";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function getDeckSearchText(deck: DeckRecord, deckCards: CardDefinition[]) {
  return [
    deck.deckName,
    deck.archetype,
    deck.publisherName,
    deck.publisherUsername,
    ...deckCards.map((card) => card.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-white/60 bg-white text-black"
          : "border-white/8 bg-[#1a1a1a] text-white/60 hover:border-white/16 hover:text-white/80"
      }`}
    >
      {label}
    </button>
  );
}

function DeckCard({
  deck,
  copied,
  shared,
  onShare,
  onCopy,
  onOpenInBuilder,
}: {
  deck: DeckRecord;
  copied: boolean;
  shared: boolean;
  onShare: () => void;
  onCopy: () => void;
  onOpenInBuilder: () => void;
}) {
  const legendaryCard = deck.legendarySlug
    ? cardsBySlug[deck.legendarySlug] ?? null
    : null;
  const deckCards = deck.cardSlugs
    .map((slug) => cardsBySlug[slug])
    .filter((card): card is CardDefinition => Boolean(card));

  const allCards = [
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

  return (
    <article className="w-full overflow-hidden rounded-[16px] border border-white/8 bg-[#141414] p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <h2 className="truncate text-sm font-bold tracking-tight text-white">
              {deck.deckName || "Untitled Deck"}
            </h2>
            <span className="text-sm font-bold tracking-tight text-white/80">
              ·
            </span>
            <span className="text-sm font-bold tracking-tight text-white/80">
              Published by {formatPublisherHandle(deck)}
            </span>
            <span className="text-sm font-bold tracking-tight text-white/80">
              ·
            </span>
            <span className="text-sm font-bold tracking-tight text-white/80">
              {formatPublishedAt(deck.publishedAt)}
            </span>
            {deck.archetype ? (
              <>
                <span className="text-sm font-bold tracking-tight text-white/80">
                  ·
                </span>
                <span className="text-sm font-bold tracking-tight text-white/80">
                  {deck.archetype}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 self-start">
          <button
            type="button"
            onClick={onShare}
            className={actionButtonClass}
            aria-label="Share"
          >
            {shared ? (
              <Check size={16} strokeWidth={2.2} className="text-green-400" />
            ) : (
              <Share2 size={16} strokeWidth={2.2} />
            )}
          </button>
          <button
            type="button"
            onClick={onCopy}
            className={actionButtonClass}
            aria-label="Copy code"
          >
            {copied ? (
              <Check size={16} strokeWidth={2.2} className="text-green-400" />
            ) : (
              <Copy size={16} strokeWidth={2.2} />
            )}
          </button>
          <button
            type="button"
            onClick={onOpenInBuilder}
            className={actionButtonClass}
            aria-label="Open in builder"
          >
            <Hammer size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {allCards.map((item, index) => (
          <div
            key={`${deck._id}-${item.slug}-${index}`}
            className={`relative aspect-275/400 overflow-hidden rounded-[4px] bg-[#1a1a1a] ${
              item.isLegendary
                ? "border border-[#e0c15a]/40"
                : "border border-white/6"
            }`}
          >
            {item.card ? (
              <Image
                src={`/${item.card.artPath}`}
                alt={item.card.name}
                fill
                sizes="(max-width: 768px) 23vw, 14vw"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-[#1a1a1a]" />
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

export function PublishedDecksBrowser({
  initialDecks,
  sharedDeckId: sharedDeckIdFromRoute = null,
}: {
  initialDecks: DeckRecord[];
  sharedDeckId?: string | null;
}) {
  const router = useRouter();
  const publishedDecks = useQuery(
    listPublishedDecksReference,
    sharedDeckIdFromRoute ? "skip" : {},
  );
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeArchetype, setActiveArchetype] = useState<string>("All");
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);
  const [sharedDeckId, setSharedDeckId] = useState<string | null>(null);
  const sourceDecks = publishedDecks ?? initialDecks;

  const normalizedDecks = useMemo(
    () => sourceDecks.map((deck) => normalizeDeckRecord(deck)),
    [sourceDecks],
  );

  const filteredDecks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return normalizedDecks.filter((deck) => {
      if (sharedDeckIdFromRoute && deck._id !== sharedDeckIdFromRoute) {
        return false;
      }

      if (activeArchetype !== "All" && deck.archetype !== activeArchetype) {
        return false;
      }

      const deckCards = [
        deck.legendarySlug ? cardsBySlug[deck.legendarySlug] ?? null : null,
        ...deck.cardSlugs.map((slug) => cardsBySlug[slug] ?? null),
      ].filter((card): card is CardDefinition => Boolean(card));

      if (normalizedSearch.length === 0) {
        return true;
      }

      return getDeckSearchText(deck, deckCards).includes(normalizedSearch);
    });
  }, [activeArchetype, normalizedDecks, search, sharedDeckIdFromRoute]);

  const activeFilterCount = activeArchetype === "All" ? 0 : 1;

  function resetFilters() {
    setSearch("");
    setActiveArchetype("All");
  }

  async function handleShare(deck: DeckRecord) {
    if (typeof window === "undefined") {
      return;
    }

    const shareUrl = `${window.location.origin}/decks?deck=${encodeURIComponent(deck._id)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setSharedDeckId(deck._id);
      window.setTimeout(
        () =>
          setSharedDeckId((current) =>
            current === deck._id ? null : current,
          ),
        1400,
      );
    } catch {
      window.prompt("Copy deck link", shareUrl);
      setSharedDeckId(deck._id);
      window.setTimeout(
        () =>
          setSharedDeckId((current) =>
            current === deck._id ? null : current,
          ),
        1400,
      );
    }
  }

  async function handleCopy(deck: DeckRecord) {
    const externalCode = await encodeExternalDeckCode(
      {
        legendarySlug: deck.legendarySlug,
        cardSlugs: deck.cardSlugs,
      },
      cardsBySlug,
    );
    const fallbackCode = encodeLocalDeckCode({
      deckName: deck.deckName,
      legendarySlug: deck.legendarySlug,
      cardSlugs: deck.cardSlugs,
      archetype: deck.archetype,
    });
    const textToCopy = externalCode ?? fallbackCode;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedDeckId(deck._id);
      window.setTimeout(
        () =>
          setCopiedDeckId((current) =>
            current === deck._id ? null : current,
          ),
        1400,
      );
    } catch {
      window.prompt("Copy deck code", textToCopy);
      setCopiedDeckId(deck._id);
      window.setTimeout(
        () =>
          setCopiedDeckId((current) =>
            current === deck._id ? null : current,
          ),
        1400,
      );
    }
  }

  async function handleOpenInBuilder(deck: DeckRecord) {
    const externalCode = await encodeExternalDeckCode(
      {
        legendarySlug: deck.legendarySlug,
        cardSlugs: deck.cardSlugs,
      },
      cardsBySlug,
    );
    const fallbackCode = encodeLocalDeckCode({
      deckName: deck.deckName,
      legendarySlug: deck.legendarySlug,
      cardSlugs: deck.cardSlugs,
      archetype: deck.archetype,
    });

    const importCode = externalCode ?? fallbackCode;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        PENDING_BUILDER_IMPORT_STORAGE_KEY,
        importCode,
      );
    }

    router.push("/deckbuilder");
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[#141414] shadow-[0_16px_32px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search decks..."
              className="h-9 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/28"
            />
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="inline-flex h-9 min-w-[112px] items-center justify-center rounded-full border border-white/10 bg-[#1a1a1a] px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-[#222222]"
              >
                Filters
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="border-t border-white/6 px-4 pb-3.5 pt-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">
                  Filter Decks
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-9 min-w-[112px] items-center justify-center rounded-full border border-white/8 bg-[#1a1a1a] px-4 text-sm font-semibold text-white/70 transition hover:border-white/16 hover:text-white"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">
                  Archetype
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={activeArchetype === "All"}
                    label={`All (${normalizedDecks.length})`}
                    onClick={() => setActiveArchetype("All")}
                  />
                  {DECK_ARCHETYPE_OPTIONS.map((archetype) => {
                    const count = normalizedDecks.filter(
                      (deck) => deck.archetype === archetype,
                    ).length;

                    return (
                      <FilterButton
                        key={archetype}
                        active={activeArchetype === archetype}
                        label={`${archetype} (${count})`}
                        onClick={() => setActiveArchetype(archetype)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {filteredDecks.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-white/10 bg-[#141414] p-8 text-center text-sm text-white/40">
          {sharedDeckIdFromRoute
            ? "That published deck could not be found."
            : "No decks matched your filters."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDecks.map((deck) => (
            <DeckCard
              key={deck._id}
              deck={deck}
              copied={copiedDeckId === deck._id}
              shared={sharedDeckId === deck._id}
              onShare={() => void handleShare(deck)}
              onCopy={() => void handleCopy(deck)}
              onOpenInBuilder={() => void handleOpenInBuilder(deck)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
