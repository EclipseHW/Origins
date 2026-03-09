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

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortCardsByMana(cards: LibraryCard[]): LibraryCard[] {
  return [...cards].sort((left, right) => {
    if (left.mana !== right.mana) {
      return left.mana - right.mana;
    }

    return left.name.localeCompare(right.name);
  });
}

function FilterChip({
  active,
  label,
  onClick,
  className,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-white/75 bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,0.12)]"
          : "border-white/10 bg-[#202020] text-white/80 hover:border-white/22 hover:bg-[#252525]"
      } ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

type TileSelection =
  | { type: "ability" }
  | { type: "generated"; name: string }
  | null;

function LibraryCardTile({
  card,
  generatedCards,
}: {
  card: LibraryCard;
  generatedCards: LibraryCard[];
}) {
  const [selection, setSelection] = useState<TileSelection>(null);
  const hasLegendaryAbility =
    card.rarity === "Legendary" && Boolean(card.legendaryPower);
  const hasSummons = generatedCards.length > 0;
  const activeGeneratedCard =
    selection?.type === "generated"
      ? generatedCards.find((generatedCard) => generatedCard.name === selection.name) ?? null
      : null;
  const showingAbility = selection?.type === "ability";
  const visibleCard = activeGeneratedCard ?? card;

  function toggleAbility() {
    setSelection((current) => (current?.type === "ability" ? null : { type: "ability" }));
  }

  function toggleGeneratedCard(name: string) {
    setSelection((current) =>
      current?.type === "generated" && current.name === name
        ? null
        : { type: "generated", name },
    );
  }

  const actionButtonClass =
    "shrink-0 whitespace-nowrap text-[13px] font-semibold transition hover:text-white hover:underline hover:underline-offset-2";
  const abilityDescription = useMemo(() => {
    if (!card.legendaryPower) {
      return null;
    }

    if (generatedCards.length === 0) {
      return card.legendaryPower;
    }

    const generatedCardsByName = new Map(
      generatedCards.map((generatedCard) => [generatedCard.name.toLowerCase(), generatedCard]),
    );
    const pattern = new RegExp(
      `(${generatedCards
        .map((generatedCard) => generatedCard.name)
        .sort((left, right) => right.length - left.length)
        .map(escapePattern)
        .join("|")})`,
      "gi",
    );

    return card.legendaryPower
      .split(pattern)
      .filter(Boolean)
      .map((part, index) => {
        const generatedCard = generatedCardsByName.get(part.toLowerCase());

        if (!generatedCard) {
          return <span key={`${card.slug}-text-${index}`}>{part}</span>;
        }

        const isActive = activeGeneratedCard?.name === generatedCard.name;

        return (
          <button
            key={`${card.slug}-text-link-${generatedCard.slug}-${index}`}
            type="button"
            onClick={() => toggleGeneratedCard(generatedCard.name)}
            className={`inline font-semibold transition hover:text-white hover:underline hover:underline-offset-2 ${
              isActive
                ? "text-white underline underline-offset-2"
                : "text-white/86 underline underline-offset-2 decoration-white/35"
            }`}
          >
            {part}
          </button>
        );
      });
  }, [activeGeneratedCard?.name, card.legendaryPower, card.slug, generatedCards]);

  return (
    <article className="space-y-3">
      <div className="relative aspect-275/400 overflow-hidden rounded-[18px] shadow-[0_22px_40px_rgba(0,0,0,0.42)]">
        {showingAbility ? (
          <div className="flex h-full flex-col rounded-[18px] bg-[#1c1c1c] px-5 py-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="space-y-2">
              <p className="text-xl font-semibold text-white">
                {card.name}
              </p>
              <p className="text-sm leading-6 text-white/82">
                {abilityDescription}
              </p>
            </div>
          </div>
        ) : (
          <Image
            src={`/${visibleCard.artPath}`}
            alt={visibleCard.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
            className="rounded-[18px] object-cover"
            priority={card.name === "Dracula"}
          />
        )}
      </div>

      {hasLegendaryAbility || hasSummons ? (
        <div className="flex items-center justify-center gap-3 overflow-x-auto text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {hasLegendaryAbility ? (
            <button
              type="button"
              onClick={toggleAbility}
              className={`${actionButtonClass} ${
                showingAbility ? "text-white underline underline-offset-2" : "text-white/72"
              }`}
            >
              Ability
            </button>
          ) : null}
          {hasSummons ? (
            generatedCards.map((generatedCard) => (
              <button
                key={generatedCard.slug}
                type="button"
                onClick={() => toggleGeneratedCard(generatedCard.name)}
                className={`${actionButtonClass} ${
                  activeGeneratedCard?.name === generatedCard.name
                    ? "text-white underline underline-offset-2"
                    : "text-white/72"
                }`}
              >
                {generatedCard.name}
              </button>
            ))
          ) : null}
        </div>
      ) : null}
    </article>
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

  const displayTitle =
    title === "Main"
      ? "Main Set"
      : title === "Items" && cards.length === 1
        ? "Item"
        : title;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          {displayTitle}
          <span className="ml-3 text-lg font-medium text-white/45">
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
            <LibraryCardTile
              key={card.slug}
              card={card}
              generatedCards={generatedCards}
            />
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
      cards: sortCardsByMana(filteredCards.filter((card) => card.section === "Main")),
    },
    {
      title: "Tokens" as const,
      cards: sortCardsByMana(filteredCards.filter((card) => card.section === "Tokens")),
    },
    {
      title: "Items" as const,
      cards: sortCardsByMana(filteredCards.filter((card) => card.section === "Items")),
    },
  ];

  const activeFilterCount =
    (activeKinds.length === CARD_KIND_OPTIONS.length ? 0 : 1) +
    (activeRarities.length === RARITY_OPTIONS.length ? 0 : 1) +
    (activeAlignments.length === ALIGNMENT_OPTIONS.length ? 0 : 1) +
    (activeKeywords.length === 0 ? 0 : 1) +
    (manaRange[0] === 0 && manaRange[1] === 10 ? 0 : 1);

  const resetFilters = () => {
    setActiveKinds([...CARD_KIND_OPTIONS]);
    setActiveRarities([...RARITY_OPTIONS]);
    setActiveAlignments([...ALIGNMENT_OPTIONS]);
    setActiveKeywords([]);
    setManaRange([0, 10]);
    setQuery("");
  };

  return (
    <section className="relative isolate space-y-8">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[24px] border border-white/12 bg-[#1c1c1c] shadow-[0_22px_44px_rgba(0,0,0,0.32)] ring-1 ring-white/[0.05]">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cards, effects, or keywords"
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
              <div className="grid gap-5 xl:grid-cols-2 xl:gap-x-8">
                <div className="space-y-3.5">
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
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

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
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

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
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

                <div className="space-y-3.5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                        Mana Cost
                      </p>
                      <span className="text-sm font-medium text-white/80">
                        {manaRange[0]} to {manaRange[1]}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#202020] px-3 py-2.5">
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

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                      Keywords
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
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
                          className="w-full whitespace-nowrap !py-[8px] px-3 text-center text-[0.8rem] leading-none"
                        />
                      ))}
                    </div>
                  </div>
                </div>
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
          <div className="rounded-[26px] border border-white/12 bg-[#1c1c1c] px-6 py-10 text-center text-white/70">
            No cards match the current filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}
