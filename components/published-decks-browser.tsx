"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { ArrowUpRight, Check, Copy } from "lucide-react";
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

function formatPublisherHandle(deck: DeckRecord) {
  if (deck.publisherUsername) {
    return deck.publisherUsername.startsWith("@")
      ? deck.publisherUsername
      : `@${deck.publisherUsername}`;
  }

  return deck.publisherName ?? "@unknown";
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
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-cyan-300/45 bg-cyan-300 text-black"
          : "border-white/10 bg-[#201d2a] text-white/72 hover:border-white/20 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function DeckCard({
  deck,
  copied,
  onCopy,
  onOpenInBuilder,
}: {
  deck: DeckRecord;
  copied: boolean;
  onCopy: () => void;
  onOpenInBuilder: () => void;
}) {
  const legendaryCard = deck.legendarySlug ? cardsBySlug[deck.legendarySlug] ?? null : null;
  const deckCards = deck.cardSlugs
    .map((slug) => cardsBySlug[slug])
    .filter((card): card is CardDefinition => Boolean(card));

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(39,16,72,0.94)_0%,rgba(27,8,49,0.96)_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),rgba(96,165,250,0)_30%),linear-gradient(135deg,rgba(43,16,77,0.92)_0%,rgba(29,8,57,0.98)_100%)] px-6 py-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="relative hidden h-[92px] w-[68px] shrink-0 overflow-hidden rounded-[14px] border border-white/12 bg-black/20 md:block">
              {legendaryCard ? (
                <Image
                  src={`/${legendaryCard.artPath}`}
                  alt={legendaryCard.name}
                  fill
                  sizes="68px"
                  className="object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[2rem] font-black tracking-tight text-white">
                  {deck.deckName || "Untitled Deck"}
                </h2>
                {deck.archetype ? (
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    {deck.archetype}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/64">
                <span>{formatPublisherHandle(deck)}</span>
                <span>{formatPublishedAt(deck.publishedAt)}</span>
                {legendaryCard ? <span>{legendaryCard.name}</span> : null}
              </div>

            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 self-start">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/6 text-white transition hover:border-white/24 hover:bg-white/10"
              aria-label={`Copy ${deck.deckName || "deck"} code`}
            >
              {copied ? <Check size={20} strokeWidth={2.2} /> : <Copy size={20} strokeWidth={2.2} />}
            </button>
            <button
              type="button"
              onClick={onOpenInBuilder}
              className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/6 text-white transition hover:border-white/24 hover:bg-white/10"
              aria-label={`Open ${deck.deckName || "deck"} in builder`}
            >
              <ArrowUpRight size={20} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {deckCards.map((card) => (
            <div
              key={`${deck._id}-${card.slug}`}
              className="relative aspect-275/400 overflow-hidden rounded-[14px] border border-white/10 bg-black/20 shadow-[0_14px_26px_rgba(0,0,0,0.22)]"
            >
              <Image
                src={`/${card.artPath}`}
                alt={card.name}
                fill
                sizes="(max-width: 768px) 28vw, (max-width: 1280px) 16vw, 12vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function PublishedDecksBrowser() {
  const router = useRouter();
  const publishedDecks = useQuery(listPublishedDecksReference, {});
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeArchetype, setActiveArchetype] = useState<string>("All");
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);

  const normalizedDecks = useMemo(
    () => (publishedDecks ?? []).map((deck) => normalizeDeckRecord(deck)),
    [publishedDecks],
  );

  const filteredDecks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return normalizedDecks.filter((deck) => {
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
  }, [activeArchetype, normalizedDecks, search]);

  const activeFilterCount = activeArchetype === "All" ? 0 : 1;

  function resetFilters() {
    setSearch("");
    setActiveArchetype("All");
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
      window.setTimeout(() => setCopiedDeckId((current) => (current === deck._id ? null : current)), 1400);
    } catch {
      window.prompt("Copy deck code", textToCopy);
      setCopiedDeckId(deck._id);
      window.setTimeout(() => setCopiedDeckId((current) => (current === deck._id ? null : current)), 1400);
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

    router.push(`/deckbuilder?deck=${encodeURIComponent(externalCode ?? fallbackCode)}`);
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[24px] border border-white/12 bg-[#1c1c1c] shadow-[0_22px_44px_rgba(0,0,0,0.32)] ring-1 ring-white/5">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search decks..."
              className="h-9 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/32"
            />
            <div className="flex items-center gap-2">
              {filtersOpen ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-white/10 bg-[#202020] px-4 py-2 text-sm font-semibold text-white/84 transition hover:border-white/24 hover:bg-[#252525]"
                >
                  Reset
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="rounded-full border border-white/14 bg-[#202020] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/28 hover:bg-[#252525]"
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="border-t border-white/10 bg-[#1c1c1c] px-4 pb-3.5 pt-4">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
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

      {publishedDecks === undefined ? (
        <div className="rounded-[28px] border border-white/10 bg-[#17141f] p-6 text-sm text-white/56">
          Loading published decks...
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/14 bg-[#17141f] p-8 text-center text-sm text-white/56">
          No decks matched your search and archetype filters.
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredDecks.map((deck) => (
            <DeckCard
              key={deck._id}
              deck={deck}
              copied={copiedDeckId === deck._id}
              onCopy={() => void handleCopy(deck)}
              onOpenInBuilder={() => void handleOpenInBuilder(deck)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
