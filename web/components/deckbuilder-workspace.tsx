"use client";

import Image from "next/image";
import { SignInButton } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { CardDefinition } from "@/lib/cards";
import {
  ALIGNMENT_OPTIONS,
  KEYWORD_OPTIONS,
  RARITY_OPTIONS,
} from "@/lib/library-types";

const BUILDER_KIND_OPTIONS = ["Unit", "Spell"] as const;
const DRAFT_STORAGE_KEY = "origins.deckbuilder.draft";

type BuilderKind = (typeof BUILDER_KIND_OPTIONS)[number];
type Visibility = "private" | "public";
type SavedState = "idle" | "saved";

type DeckDraft = {
  legendarySlug: string | null;
  cardSlugs: string[];
  notes: string;
  visibility: Visibility;
};

function toggleValue<T extends string>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

function sortCardsByMana(cards: CardDefinition[]): CardDefinition[] {
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
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-white/75 bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,0.12)]"
          : "border-white/10 bg-[#202020] text-white/80 hover:border-white/22 hover:bg-[#252525]"
      }`}
    >
      {label}
    </button>
  );
}

function DeckSlot({
  card,
  countLabel,
  placeholder,
  onRemove,
  tall = false,
}: {
  card: CardDefinition | null;
  countLabel: string;
  placeholder: string;
  onRemove: () => void;
  tall?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border border-white/10 bg-[#1c1c1c] p-3 shadow-[0_18px_34px_rgba(0,0,0,0.24)] ${
        tall ? "space-y-4" : "space-y-3"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
          {countLabel}
        </p>
        {card ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-white/10 bg-[#232323] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-white/26 hover:text-white"
          >
            Remove
          </button>
        ) : null}
      </div>

      {card ? (
        <div className="space-y-3">
          <div
            className={`relative overflow-hidden rounded-[18px] shadow-[0_18px_30px_rgba(0,0,0,0.34)] ${
              tall ? "aspect-[275/400]" : "aspect-[275/400]"
            }`}
          >
            <Image
              src={`/${card.artPath}`}
              alt={card.name}
              fill
              sizes={tall ? "(max-width: 1280px) 100vw, 24vw" : "(max-width: 1280px) 33vw, 12vw"}
              className="object-cover"
            />
            <div className="absolute right-2 top-2 rounded-full border border-white/12 bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
              {countLabel}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{card.name}</p>
            <p className="text-xs text-white/45">
              Mana {card.mana} • {card.cardType}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded-[18px] border border-dashed border-white/12 bg-[#202020] text-center text-sm text-white/34 ${
            tall ? "aspect-[275/400] px-6" : "aspect-[275/400] px-3"
          }`}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}

function BuilderLibraryCard({
  card,
  selected,
  disabled,
  overlayLabel,
  onAdd,
}: {
  card: CardDefinition;
  selected: boolean;
  disabled: boolean;
  overlayLabel: string | null;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className="group space-y-2 text-left"
    >
      <div
        className={`relative aspect-[275/400] overflow-hidden rounded-[18px] shadow-[0_18px_34px_rgba(0,0,0,0.3)] transition ${
          disabled ? "grayscale opacity-45" : "group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_40px_rgba(0,0,0,0.36)]"
        }`}
      >
        <Image
          src={`/${card.artPath}`}
          alt={card.name}
          fill
          sizes="(max-width: 768px) 33vw, (max-width: 1280px) 20vw, 12vw"
          className="object-cover"
        />
        {overlayLabel ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/52">
            <span className="rounded-full border border-white/14 bg-black/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {overlayLabel}
            </span>
          </div>
        ) : null}
      </div>
      <div className="space-y-0.5">
        <p className={`truncate text-sm font-semibold ${selected ? "text-white/64" : "text-white"}`}>
          {card.name}
        </p>
        <p className="text-xs text-white/40">
          Mana {card.mana} • {card.rarity}
        </p>
      </div>
    </button>
  );
}

export function DeckbuilderWorkspace({
  cards,
  isSignedIn,
}: {
  cards: CardDefinition[];
  isSignedIn: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeKinds, setActiveKinds] = useState<BuilderKind[]>([
    ...BUILDER_KIND_OPTIONS,
  ]);
  const [activeRarities, setActiveRarities] = useState<string[]>([
    ...RARITY_OPTIONS,
  ]);
  const [activeAlignments, setActiveAlignments] = useState<string[]>([
    ...ALIGNMENT_OPTIONS,
  ]);
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [manaRange, setManaRange] = useState<[number, number]>([0, 10]);
  const [legendarySlug, setLegendarySlug] = useState<string | null>(null);
  const [cardSlugs, setCardSlugs] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [savedState, setSavedState] = useState<SavedState>("idle");

  const cardBySlug = useMemo(
    () => Object.fromEntries(cards.map((card) => [card.slug, card])),
    [cards],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<DeckDraft>;
      const nextLegendary =
        typeof parsed.legendarySlug === "string" &&
        cardBySlug[parsed.legendarySlug]?.rarity === "Legendary"
          ? parsed.legendarySlug
          : null;
      const nextCards = Array.isArray(parsed.cardSlugs)
        ? parsed.cardSlugs
            .filter((slug): slug is string => typeof slug === "string")
            .filter((slug) => Boolean(cardBySlug[slug]) && cardBySlug[slug].rarity !== "Legendary")
            .slice(0, 12)
        : [];

      setLegendarySlug(nextLegendary);
      setCardSlugs(nextCards);
      setNotes(typeof parsed.notes === "string" ? parsed.notes : "");
      setVisibility(parsed.visibility === "public" ? "public" : "private");
      setSavedState("saved");
    } catch {
      // Ignore bad local drafts and start from a clean builder state.
    }
  }, [cardBySlug]);

  useEffect(() => {
    if (savedState !== "saved") {
      return;
    }

    const timeout = window.setTimeout(() => setSavedState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [savedState]);

  const legendaryCard = legendarySlug ? cardBySlug[legendarySlug] ?? null : null;
  const deckCards = cardSlugs.map((slug) => cardBySlug[slug]).filter(Boolean);
  const coreCopies = cardSlugs.length * 2;
  const totalDeckSize = coreCopies + (legendaryCard ? 1 : 0);

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortCardsByMana(
      cards.filter((card) => {
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
        const matchesKind = activeKinds.includes(card.cardType as BuilderKind);
        const matchesMana = card.mana >= manaRange[0] && card.mana <= manaRange[1];
        const matchesRarity = activeRarities.includes(card.rarity);
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
      }),
    );
  }, [
    activeAlignments,
    activeKinds,
    activeKeywords,
    activeRarities,
    cards,
    manaRange,
    query,
  ]);

  const activeFilterCount =
    (activeKinds.length === BUILDER_KIND_OPTIONS.length ? 0 : 1) +
    (activeRarities.length === RARITY_OPTIONS.length ? 0 : 1) +
    (activeAlignments.length === ALIGNMENT_OPTIONS.length ? 0 : 1) +
    (activeKeywords.length === 0 ? 0 : 1) +
    (manaRange[0] === 0 && manaRange[1] === 10 ? 0 : 1);

  function resetFilters() {
    setActiveKinds([...BUILDER_KIND_OPTIONS]);
    setActiveRarities([...RARITY_OPTIONS]);
    setActiveAlignments([...ALIGNMENT_OPTIONS]);
    setActiveKeywords([]);
    setManaRange([0, 10]);
    setQuery("");
  }

  function handleAddCard(card: CardDefinition) {
    if (card.rarity === "Legendary") {
      setLegendarySlug(card.slug);
      return;
    }

    setCardSlugs((current) => {
      if (current.includes(card.slug) || current.length >= 12) {
        return current;
      }

      return [...current, card.slug];
    });
  }

  function handleSaveDraft() {
    const draft: DeckDraft = {
      legendarySlug,
      cardSlugs,
      notes,
      visibility,
    };

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setSavedState("saved");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-[32px] border border-white/10 bg-[#1c1c1c] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
              Deckbuilder
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Build the list.
            </h1>
            <p className="text-sm leading-6 text-white/65">
              1 legendary plus 12 unique cards. Each non-legendary slot counts
              as 2 copies, so the completed deck lands at 25 cards.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#202020] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                Legendary
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {legendaryCard ? "1" : "0"}/1
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#202020] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                Core
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {cardSlugs.length}/12
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#202020] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                Deck Size
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {totalDeckSize}/25
              </p>
            </div>
          </div>
        </div>

        <DeckSlot
          card={legendaryCard}
          countLabel="x1"
          placeholder="Select a legendary card."
          onRemove={() => setLegendarySlug(null)}
          tall
        />

        <div className="rounded-[32px] border border-white/10 bg-[#1c1c1c] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                Core Deck
              </p>
              <p className="mt-1 text-sm text-white/62">
                12 unique picks, 2 copies each.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-[#202020] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
              {cardSlugs.length}/12
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 12 }, (_, index) => {
              const card = deckCards[index] ?? null;

              return (
                <DeckSlot
                  key={index}
                  card={card}
                  countLabel="x2"
                  placeholder={`Slot ${index + 1}`}
                  onRemove={() =>
                    setCardSlugs((current) => current.filter((_, currentIndex) => currentIndex !== index))
                  }
                />
              );
            })}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#1c1c1c] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                Visibility
              </p>
              <div className="inline-flex rounded-full border border-white/10 bg-[#202020] p-1">
                {(["private", "public"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVisibility(option)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                      visibility === option
                        ? "bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,0.12)]"
                        : "text-white/72 hover:text-white"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="deck-notes"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42"
              >
                Notes
              </label>
              <textarea
                id="deck-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Why this legendary, matchup notes, mulligan ideas..."
                className="min-h-28 w-full rounded-[22px] border border-white/10 bg-[#202020] px-4 py-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-white/24"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Save draft
              </button>
              {isSignedIn ? (
                <button
                  type="button"
                  className="rounded-full border border-white/12 bg-[#202020] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-[#252525]"
                >
                  Publish deck
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="rounded-full border border-white/12 bg-[#202020] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-[#252525]">
                    Login to publish
                  </button>
                </SignInButton>
              )}
              <span className="text-sm text-white/55">
                {savedState === "saved" ? "Draft saved locally." : "Local drafts are saved to this browser."}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="space-y-4">
        <div className="rounded-[32px] border border-white/10 bg-[#1c1c1c] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/42">
                  Card Library
                </p>
                <p className="text-sm text-white/64">
                  Left click to add a card. Added cards gray out because each
                  slot only allows one unique pick.
                </p>
              </div>
              <div className="text-sm text-white/58">
                {filteredCards.length} cards
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#202020]">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search cards, effects, or keywords"
                  className="h-9 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/30"
                />
                <div className="flex items-center gap-2">
                  {filtersOpen ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-full border border-white/10 bg-[#252525] px-4 py-2 text-sm font-semibold text-white/84 transition hover:border-white/22 hover:bg-[#2b2b2b]"
                    >
                      Reset
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((open) => !open)}
                    className="rounded-full border border-white/12 bg-[#252525] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-[#2b2b2b]"
                  >
                    Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  </button>
                </div>
              </div>

              {filtersOpen ? (
                <div className="border-t border-white/10 bg-[#1c1c1c] px-4 pb-4 pt-4">
                  <div className="grid gap-5 xl:grid-cols-2 xl:gap-x-8">
                    <div className="space-y-3.5">
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                          Type
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {BUILDER_KIND_OPTIONS.map((kind) => (
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
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                          Rarity
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {RARITY_OPTIONS.map((rarity) => (
                            <FilterChip
                              key={rarity}
                              label={rarity}
                              active={activeRarities.includes(rarity)}
                              onClick={() =>
                                setActiveRarities((current) => toggleValue(current, rarity))
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
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
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
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
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
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
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#1c1c1c] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {filteredCards.map((card) => {
              const isSelected =
                legendarySlug === card.slug || cardSlugs.includes(card.slug);
              const isDisabled =
                card.rarity === "Legendary"
                  ? legendarySlug === card.slug
                  : isSelected || cardSlugs.length >= 12;
              const overlayLabel =
                legendarySlug === card.slug
                  ? "Legendary"
                  : cardSlugs.includes(card.slug)
                    ? "Added"
                    : card.rarity !== "Legendary" && cardSlugs.length >= 12
                      ? "Full"
                      : null;

              return (
                <BuilderLibraryCard
                  key={card.slug}
                  card={card}
                  selected={isSelected}
                  disabled={isDisabled}
                  overlayLabel={overlayLabel}
                  onAdd={() => handleAddCard(card)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
