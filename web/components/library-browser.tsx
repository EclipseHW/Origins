"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  ALIGNMENT_OPTIONS,
  CARD_KIND_OPTIONS,
  KEYWORD_OPTIONS,
  RARITY_OPTIONS,
  type FilterCardKind,
  type LibraryCard,
  type LibrarySection,
} from "@/lib/library-types";

function toggleValue<T extends string>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

function FilterChip({
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
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-white bg-white text-black"
          : "border-white/12 bg-white/[0.04] text-zinc-200 hover:border-white/30 hover:bg-white/[0.08]"
      }`}
    >
      {label}
    </button>
  );
}

function HoverPreview({
  generatedCards,
}: {
  generatedCards: LibraryCard[];
}) {
  if (generatedCards.length === 0) {
    return null;
  }

  const previewCards = generatedCards.slice(0, 2);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/78 opacity-0 transition duration-200 group-hover:opacity-100">
      <div className={`grid gap-3 ${previewCards.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {previewCards.map((generatedCard) => (
          <div
            key={generatedCard.slug}
            className="overflow-hidden rounded-[14px] border border-white/15 bg-black/70 shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
          >
            <Image
              src={`/${generatedCard.artPath}`}
              alt={generatedCard.name}
              width={92}
              height={134}
              className="h-auto w-[92px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CardGridSection({
  title,
  cards,
  cardLookup,
}: {
  title: LibrarySection;
  cards: LibraryCard[];
  cardLookup: Record<string, LibraryCard>;
}) {
  if (cards.length === 0) {
    return null;
  }

  const displayTitle = title === "Items" && cards.length === 1 ? "Item" : title;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          {displayTitle}
          <span className="ml-3 text-lg font-medium text-zinc-400">
            ({cards.length})
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map((card) => {
          const generatedCards = card.generatedCardNames
            .map((name) => cardLookup[name])
            .filter((generatedCard): generatedCard is LibraryCard => Boolean(generatedCard));

          return (
            <article
              key={card.slug}
              className="group relative rounded-[24px] border border-white/10 bg-white/[0.04] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur"
            >
              <div className="relative overflow-hidden rounded-[18px]">
                <Image
                  src={`/${card.artPath}`}
                  alt={card.name}
                  width={275}
                  height={400}
                  className="h-auto w-full rounded-[18px]"
                  priority={card.name === "Dracula"}
                />
                <HoverPreview generatedCards={generatedCards} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function LibraryBrowser({ cards }: { cards: LibraryCard[] }) {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeKinds, setActiveKinds] = useState<FilterCardKind[]>([
    ...CARD_KIND_OPTIONS,
  ]);
  const [activeRarities, setActiveRarities] = useState<string[]>([
    ...RARITY_OPTIONS,
  ]);
  const [activeAlignments, setActiveAlignments] = useState<string[]>([
    ...ALIGNMENT_OPTIONS,
  ]);
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [manaRange, setManaRange] = useState<[number, number]>([0, 10]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return cards.filter((card) => {
      const searchableText = [
        card.name,
        card.effect,
        card.legendaryPower,
        card.keywords.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);

      const matchesKind = activeKinds.includes(card.filterKind);
      const matchesMana =
        card.mana >= manaRange[0] && card.mana <= manaRange[1];
      const matchesRarity =
        card.section === "Main"
          ? activeRarities.includes(card.rarity)
          : true;
      const matchesAlignment = activeAlignments.includes(card.alignment);
      const matchesKeywords =
        activeKeywords.length === 0 ||
        activeKeywords.some((keyword) => card.keywords.includes(keyword));

      return (
        matchesQuery &&
        matchesKind &&
        matchesMana &&
        matchesRarity &&
        matchesAlignment &&
        matchesKeywords
      );
    });
  }, [
    activeAlignments,
    activeKinds,
    activeKeywords,
    activeRarities,
    cards,
    manaRange,
    query,
  ]);

  const cardLookup = useMemo(
    () => Object.fromEntries(cards.map((card) => [card.name, card])),
    [cards],
  );

  const sections = [
    {
      title: "Main" as const,
      cards: filteredCards.filter((card) => card.section === "Main"),
    },
    {
      title: "Tokens" as const,
      cards: filteredCards.filter((card) => card.section === "Tokens"),
    },
    {
      title: "Items" as const,
      cards: filteredCards.filter((card) => card.section === "Items"),
    },
  ];

  const activeFilterCount =
    (activeKinds.length === CARD_KIND_OPTIONS.length ? 0 : 1) +
    (activeRarities.length === RARITY_OPTIONS.length ? 0 : 1) +
    (activeAlignments.length === ALIGNMENT_OPTIONS.length ? 0 : 1) +
    (activeKeywords.length === 0 ? 0 : 1) +
    (manaRange[0] === 0 && manaRange[1] === 10 ? 0 : 1);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_24px_50px_rgba(0,0,0,0.32)] backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cards, effects, or keywords"
              className="h-9 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.12]"
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          {filtersOpen ? (
            <div className="border-t border-white/10 px-4 py-5">
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Type
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CARD_KIND_OPTIONS.map((kind) => (
                        <FilterChip
                          key={kind}
                          label={kind}
                          active={activeKinds.includes(kind)}
                          onClick={() =>
                            setActiveKinds((current) => toggleValue(current, kind))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Rarity
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {RARITY_OPTIONS.map((rarity) => (
                        <FilterChip
                          key={rarity}
                          label={rarity}
                          active={activeRarities.includes(rarity)}
                          onClick={() =>
                            setActiveRarities((current) =>
                              toggleValue(current, rarity),
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Alignment
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ALIGNMENT_OPTIONS.map((alignment) => (
                        <FilterChip
                          key={alignment}
                          label={alignment}
                          active={activeAlignments.includes(alignment)}
                          onClick={() =>
                            setActiveAlignments((current) =>
                              toggleValue(current, alignment),
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Mana Cost
                      </p>
                      <span className="text-sm font-medium text-zinc-200">
                        {manaRange[0]} to {manaRange[1]}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-5">
                      <Slider
                        min={0}
                        max={10}
                        step={1}
                        value={manaRange}
                        onValueChange={(value) =>
                          setManaRange([value[0] ?? 0, value[1] ?? 10])
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Keywords
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {KEYWORD_OPTIONS.map((keyword) => (
                        <FilterChip
                          key={keyword}
                          label={keyword}
                          active={activeKeywords.includes(keyword)}
                          onClick={() =>
                            setActiveKeywords((current) =>
                              toggleValue(current, keyword),
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <p className="text-sm text-zinc-300">
                  {filteredCards.length} matching cards
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveKinds([...CARD_KIND_OPTIONS]);
                    setActiveRarities([...RARITY_OPTIONS]);
                    setActiveAlignments([...ALIGNMENT_OPTIONS]);
                    setActiveKeywords([]);
                    setManaRange([0, 10]);
                    setQuery("");
                  }}
                  className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:bg-white/8"
                >
                  Reset filters
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-10">
        {sections.map((section) => (
          <CardGridSection
            key={section.title}
            title={section.title}
            cards={section.cards}
            cardLookup={cardLookup}
          />
        ))}
        {filteredCards.length === 0 ? (
          <div className="rounded-[26px] border border-white/10 bg-white/7 px-6 py-10 text-center text-slate-300 backdrop-blur">
            No cards match the current filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}
