"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { CardDefinition } from "@/lib/cards";
import {
  ALIGNMENT_OPTIONS,
  KEYWORD_OPTIONS,
  RARITY_OPTIONS,
} from "@/lib/library-types";

const BUILDER_KIND_OPTIONS = ["Unit", "Spell"] as const;
const EMPTY_CARD_SLUGS: string[] = [];
const EXTERNAL_DECK_CODE_PREFIX = "KGBLDC";
const EXTERNAL_DECK_CODE_VERSION = "v1";

type BuilderKind = (typeof BUILDER_KIND_OPTIONS)[number];
type SavedState = "idle" | "saved";

type DeckDraft = {
  deckName: string;
  legendarySlug: string | null;
  cardSlugs: string[];
};

type DeckRecord = DeckDraft & {
  _id: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
};

const listMyDecksReference = makeFunctionReference<
  "query",
  Record<string, never>,
  DeckRecord[]
>("decks:listMine");
const createDeckReference = makeFunctionReference<
  "mutation",
  { deckName: string },
  string
>("decks:create");
const updateDeckReference = makeFunctionReference<
  "mutation",
  {
    deckId: string;
    deckName: string;
    legendarySlug: string | null;
    cardSlugs: string[];
  },
  void
>("decks:update");
const deleteDeckReference = makeFunctionReference<
  "mutation",
  { deckId: string },
  void
>("decks:remove");

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

function formatDeckName(name: string): string {
  return name.trim() || "Untitled Deck";
}

function createDeckId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `deck-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyDeck(name = ""): DeckRecord {
  const timestamp = Date.now();

  return {
    _id: createDeckId(),
    deckName: name,
    legendarySlug: null,
    cardSlugs: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function getOpeningHandSize(legendaryCard: CardDefinition | null): number {
  const source = [legendaryCard?.effect, legendaryCard?.legendaryPower]
    .filter(Boolean)
    .join(" ");
  const match = source.match(/you start with (\d+) less cards?/i);
  const penalty = Number(match?.[1] ?? 0);

  return Math.max(0, 6 - penalty);
}

function drawRandomHand(deck: string[], handSize: number): string[] {
  const pool = [...deck];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }

  return pool.slice(0, Math.min(handSize, pool.length));
}

type ImportedDeckState = {
  legendarySlug: string | null;
  cardSlugs: string[];
};

function encodeLocalDeckCode(deck: ImportedDeckState): string {
  const payload = JSON.stringify(deck);
  return `OB1:${btoa(payload)}`;
}

async function computeExternalDeckCodeChecksum(payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 8);
}

async function encodeExternalDeckCode(
  deck: ImportedDeckState,
  cardBySlug: Record<string, CardDefinition>,
): Promise<string | null> {
  const slugs = [deck.legendarySlug, ...deck.cardSlugs].filter(
    (slug): slug is string => typeof slug === "string" && slug.length > 0,
  );
  const externalIds: string[] = [];

  for (const slug of slugs) {
    const externalCodeId = cardBySlug[slug]?.externalCodeId;
    if (!externalCodeId) {
      return null;
    }

    externalIds.push(externalCodeId);
  }

  const payloadText = [...externalIds].sort((left, right) => left.localeCompare(right)).join("|");
  const decodedPayload = `${EXTERNAL_DECK_CODE_VERSION}|${payloadText}`;
  const payload = `${EXTERNAL_DECK_CODE_PREFIX}${btoa(decodedPayload)}`;
  const checksum = await computeExternalDeckCodeChecksum(decodedPayload);

  return `${payload}:${checksum}`;
}

function decodeLocalDeckCode(code: string): ImportedDeckState | null {
  if (!code.startsWith("OB1:")) {
    return null;
  }

  try {
    const decoded = atob(code.slice(4));
    const parsed = JSON.parse(decoded) as Partial<ImportedDeckState>;

    return {
      legendarySlug:
        typeof parsed.legendarySlug === "string" ? parsed.legendarySlug : null,
      cardSlugs: Array.isArray(parsed.cardSlugs)
        ? parsed.cardSlugs.filter((slug): slug is string => typeof slug === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function decodeExternalDeckCode(
  code: string,
  cardByExternalId: Record<string, CardDefinition>,
): ImportedDeckState | null {
  const [payload] = code.trim().split(":");
  if (!payload || !payload.startsWith(EXTERNAL_DECK_CODE_PREFIX)) {
    return null;
  }

  try {
    const decoded = atob(payload.slice(EXTERNAL_DECK_CODE_PREFIX.length));
    const [version, ...entries] = decoded.split("|").filter(Boolean);
    if (version !== EXTERNAL_DECK_CODE_VERSION) {
      return null;
    }

    let legendarySlug: string | null = null;
    const cardSlugs: string[] = [];

    for (const entry of entries) {
      const card = cardByExternalId[entry];
      if (!card) {
        return null;
      }

      if (entry.endsWith("_MC")) {
        legendarySlug = card.slug;
        continue;
      }

      cardSlugs.push(card.slug);
    }

    return {
      legendarySlug,
      cardSlugs,
    };
  } catch {
    return null;
  }
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

function DeckFrame({
  card,
  onRemove,
  highlight = false,
  compact = false,
}: {
  card: CardDefinition | null;
  onRemove: () => void;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden border bg-[#1c1c1c] shadow-[0_18px_34px_rgba(0,0,0,0.24)] ${
        compact ? "rounded-none" : "rounded-[22px]"
      } ${
        highlight
          ? "border-[#e0c15a]/70 ring-1 ring-[#e0c15a]/20"
          : "border-white/10"
      }`}
    >
      {card ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${card.name}`}
          className="block w-full text-left"
        >
          <div className="relative aspect-275/400 overflow-hidden">
            <Image
              src={`/${card.artPath}`}
              alt={card.name}
              fill
              sizes={compact ? "(max-width: 1280px) 24vw, 96px" : "(max-width: 1280px) 40vw, 144px"}
              className="object-cover"
            />
          </div>
        </button>
      ) : (
        <div
          className={`aspect-275/400 border border-dashed ${
            compact ? "rounded-none" : "rounded-[21px]"
          } ${
            highlight
              ? "border-[#e0c15a]/45 bg-[radial-gradient(circle_at_top,rgba(224,193,90,0.16),rgba(0,0,0,0)_62%)]"
              : "border-white/12 bg-[#202020]"
          }`}
        />
      )}
    </div>
  );
}

function BuilderLibraryCard({
  card,
  disabled,
  overlayLabel,
  onAdd,
}: {
  card: CardDefinition;
  disabled: boolean;
  overlayLabel: string | null;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className="group text-left"
    >
      <div
        className={`relative aspect-275/400 overflow-hidden rounded-[18px] shadow-[0_18px_34px_rgba(0,0,0,0.3)] transition ${
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
    </button>
  );
}

function DeckListCard({
  deck,
  selected,
  cardBySlug,
  editing,
  renameValue,
  onSelect,
  onRenameChange,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onDelete,
}: {
  deck: DeckRecord;
  selected: boolean;
  cardBySlug: Record<string, CardDefinition>;
  editing: boolean;
  renameValue: string;
  onSelect: () => void;
  onRenameChange: (value: string) => void;
  onRenameStart: () => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onDelete: () => void;
}) {
  const previewCard =
    (deck.legendarySlug ? cardBySlug[deck.legendarySlug] : null) ??
    cardBySlug[deck.cardSlugs[0] ?? ""] ??
    null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`group relative w-full max-w-[420px] overflow-hidden rounded-[24px] border text-left shadow-[0_18px_34px_rgba(0,0,0,0.18)] transition ${
        selected
          ? "border-[#e0c15a] bg-white ring-2 ring-[#e0c15a]/25"
          : "border-black/8 bg-white hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(0,0,0,0.2)]"
      }`}
      aria-label={`Open ${formatDeckName(deck.deckName)}`}
    >
      {previewCard ? (
        <>
          <div className="absolute inset-y-0 left-0 w-32 overflow-hidden">
            <Image
              src={`/${previewCard.artPath}`}
              alt={previewCard.name}
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.88)_24%,rgba(255,255,255,0.96)_54%,rgba(255,255,255,1)_100%)]" />
        </>
      ) : null}

      <div className="relative flex min-h-[104px] items-center justify-between gap-4 px-4 py-4 pl-28 text-black">
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-black/45">
            {deck.legendarySlug ? "Legendary deck" : "Draft deck"}
          </p>
          {editing ? (
            <input
              type="text"
              value={renameValue}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onRenameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onRenameSave();
                }

                if (event.key === "Escape") {
                  onRenameCancel();
                }
              }}
              placeholder="Deck name"
              autoFocus
              className="mt-2 w-full rounded-full border border-black/12 bg-black/4 px-3 py-2 text-sm font-semibold text-black outline-none placeholder:text-black/30 focus:border-black/20"
            />
          ) : (
            <p className="truncate pt-1 text-base font-semibold text-black">
              {formatDeckName(deck.deckName)}
            </p>
          )}
          <p className="pt-1 text-sm text-black/58">
            {previewCard ? previewCard.name : "Pick a legendary card"} ·{" "}
            {deck.cardSlugs.length}/12 cards
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {editing ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRenameSave();
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:bg-black/88"
              aria-label={`Save ${formatDeckName(deck.deckName)}`}
              title="Save deck name"
            >
              <Image src="/icons/check.png" alt="" width={18} height={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRenameStart();
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:bg-black/88"
              aria-label={`Edit ${formatDeckName(deck.deckName)}`}
              title="Edit deck name"
            >
              <Image src="/icons/edit.svg" alt="" width={18} height={18} />
            </button>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 transition hover:bg-red-100"
            aria-label={`Delete ${formatDeckName(deck.deckName)}`}
            title="Delete deck"
          >
            <Image src="/icons/trash-1.png" alt="" width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeckbuilderWorkspace({
  cards,
}: {
  cards: CardDefinition[];
}) {
  const { isLoaded, isSignedIn } = useUser();
  const { isLoading: convexAuthLoading, isAuthenticated: convexAuthenticated } =
    useConvexAuth();
  const hasClerkSession = isLoaded && isSignedIn;
  const canUseCloudDecks = hasClerkSession && convexAuthenticated;
  const cloudDecksPending = hasClerkSession && convexAuthLoading;
  const signedInDecks = useQuery(
    listMyDecksReference,
    canUseCloudDecks ? {} : "skip",
  );
  const createDeckMutation = useMutation(createDeckReference);
  const updateDeckMutation = useMutation(updateDeckReference);
  const deleteDeckMutation = useMutation(deleteDeckReference);
  const cardBySlug = useMemo(
    () => Object.fromEntries(cards.map((card) => [card.slug, card])),
    [cards],
  );
  const cardByExternalId = useMemo(
    () =>
      Object.fromEntries(
        cards
          .filter((card) => Boolean(card.externalCodeId))
          .map((card) => [card.externalCodeId as string, card]),
      ),
    [cards],
  );
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
  const [guestDecks, setGuestDecks] = useState<DeckRecord[]>([createEmptyDeck()]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savedState, setSavedState] = useState<SavedState>("idle");
  const [mulliganHand, setMulliganHand] = useState<string[]>([]);
  const [mulliganOpen, setMulliganOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (savedState !== "saved") {
      return;
    }

    const timeout = window.setTimeout(() => setSavedState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [savedState]);

  useEffect(() => {
    if (!copyFeedback) {
      return;
    }

    const timeout = window.setTimeout(() => setCopyFeedback(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  const savedDecks = useMemo(() => {
    if (!isSignedIn) {
      return guestDecks;
    }

    if (!canUseCloudDecks) {
      return [];
    }

    return signedInDecks ?? [];
  }, [canUseCloudDecks, guestDecks, isSignedIn, signedInDecks]);
  const sortedDecks = useMemo(
    () => [...savedDecks].sort((left, right) => right.updatedAt - left.updatedAt),
    [savedDecks],
  );
  const effectiveSelectedDeckId = hasClerkSession
    ? selectedDeckId && sortedDecks.some((deck) => deck._id === selectedDeckId)
      ? selectedDeckId
      : null
    : selectedDeckId && sortedDecks.some((deck) => deck._id === selectedDeckId)
      ? selectedDeckId
      : sortedDecks[0]?._id ?? null;
  const selectedDeck = useMemo(() => {
    if (sortedDecks.length === 0 || !effectiveSelectedDeckId) {
      return null;
    }

    return sortedDecks.find((deck) => deck._id === effectiveSelectedDeckId) ?? null;
  }, [effectiveSelectedDeckId, sortedDecks]);
  const deckName = selectedDeck?.deckName ?? "";
  const legendarySlug = selectedDeck?.legendarySlug ?? null;
  const cardSlugs = selectedDeck?.cardSlugs ?? EMPTY_CARD_SLUGS;
  const legendaryCard = legendarySlug ? cardBySlug[legendarySlug] ?? null : null;
  const deckCards = cardSlugs.map((slug) => cardBySlug[slug]).filter(Boolean);
  const openingHandSize = getOpeningHandSize(legendaryCard);
  const fullDeck = useMemo(() => {
    const nextDeck: string[] = [];

    if (legendarySlug && cardBySlug[legendarySlug]) {
      nextDeck.push(legendarySlug);
    }

    cardSlugs.forEach((slug) => {
      if (!cardBySlug[slug]) {
        return;
      }

      nextDeck.push(slug, slug);
    });

    return nextDeck;
  }, [cardBySlug, cardSlugs, legendarySlug]);
  const mulliganCards = mulliganHand
    .map((slug) => cardBySlug[slug])
    .filter((card): card is CardDefinition => Boolean(card));

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

  function updateGuestDeck(
    deckId: string,
    updater: (deck: DeckRecord) => DeckRecord,
  ) {
    setGuestDecks((current) =>
      current.map((deck) =>
        deck._id === deckId ? { ...updater(deck), updatedAt: Date.now() } : deck,
      ),
    );
  }

  async function persistDeck(
    deckId: string,
    updater: (deck: DeckRecord) => DeckRecord,
  ) {
    const deck = savedDecks.find((candidate) => candidate._id === deckId);
    if (!deck) {
      return;
    }

    const nextDeck = updater(deck);
    if (canUseCloudDecks) {
      await updateDeckMutation({
        deckId,
        deckName: nextDeck.deckName,
        legendarySlug: nextDeck.legendarySlug,
        cardSlugs: nextDeck.cardSlugs,
      });
      setSavedState("saved");
      return;
    }

    if (!hasClerkSession) {
      updateGuestDeck(deckId, updater);
    }
  }

  async function updateSelectedDeck(updater: (deck: DeckRecord) => DeckRecord) {
    if (!selectedDeck) {
      return;
    }

    await persistDeck(selectedDeck._id, updater);
  }

  async function handleCreateDeck() {
    if (canUseCloudDecks) {
      const nextDeckId = await createDeckMutation({ deckName: "" });
      setSelectedDeckId(nextDeckId);
      setEditingDeckId(nextDeckId);
      setRenameValue("");
      setSavedState("saved");
      setMulliganHand([]);
      setMulliganOpen(false);
      return;
    }

    if (hasClerkSession) {
      return;
    }

    const nextDeck = createEmptyDeck();

    setGuestDecks((current) => [nextDeck, ...current]);
    setSelectedDeckId(nextDeck._id);
    setEditingDeckId(nextDeck._id);
    setRenameValue(nextDeck.deckName);
    setSavedState("idle");
    setMulliganHand([]);
    setMulliganOpen(false);
  }

  function handleRenameStart(deck: DeckRecord) {
    setSelectedDeckId(deck._id);
    setEditingDeckId(deck._id);
    setRenameValue(deck.deckName);
  }

  function handleBackToDecks() {
    setSelectedDeckId(null);
    setEditingDeckId(null);
    setMulliganOpen(false);
  }

  async function handleRenameSave(deckId: string) {
    await persistDeck(deckId, (deck) => ({
      ...deck,
      deckName: renameValue.trim(),
    }));
    setEditingDeckId(null);
  }

  async function handleDeleteSavedDeck(deckId: string) {
    const deckToDelete = savedDecks.find((deck) => deck._id === deckId);
    if (!deckToDelete) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${formatDeckName(deckToDelete.deckName)}?`,
    );
    if (!confirmed) {
      return;
    }

    const remainingDecks = savedDecks.filter((deck) => deck._id !== deckId);
    if (canUseCloudDecks) {
      await deleteDeckMutation({ deckId });
    } else if (!hasClerkSession) {
      if (remainingDecks.length === 0) {
        setGuestDecks([createEmptyDeck()]);
      } else {
        setGuestDecks(remainingDecks);
      }
    }

    if (selectedDeckId === deckId) {
      const nextSelectedDeck = remainingDecks[0] ?? null;
      setSelectedDeckId(hasClerkSession ? null : nextSelectedDeck?._id ?? null);
    }

    setEditingDeckId((current) => (current === deckId ? null : current));
    setSavedState(canUseCloudDecks ? "saved" : "idle");
    setMulliganHand([]);
    setMulliganOpen(false);
  }

  async function handleAddCard(card: CardDefinition) {
    if (!selectedDeck) {
      return;
    }

    if (card.rarity === "Legendary") {
      await updateSelectedDeck((deck) => ({
        ...deck,
        legendarySlug: card.slug,
      }));
      return;
    }

    await updateSelectedDeck((deck) => {
      if (deck.cardSlugs.includes(card.slug) || deck.cardSlugs.length >= 12) {
        return deck;
      }

      return {
        ...deck,
        cardSlugs: [...deck.cardSlugs, card.slug],
      };
    });
  }

  async function handleSaveDraft() {
    if (!selectedDeck) {
      return;
    }

    await persistDeck(selectedDeck._id, (deck) => deck);
    if (!isSignedIn) {
      setSavedState("idle");
    }
  }

  function handleRandomMulligan() {
    if (fullDeck.length === 0) {
      return;
    }

    setMulliganHand(drawRandomHand(fullDeck, openingHandSize));
    setMulliganOpen(true);
  }

  async function handleCopyDeckCode() {
    if (!selectedDeck) {
      return;
    }

    const code = await encodeExternalDeckCode(
      {
        legendarySlug: selectedDeck.legendarySlug,
        cardSlugs: selectedDeck.cardSlugs,
      },
      cardBySlug,
    );

    if (!code) {
      window.alert("This deck contains cards that do not have export codes yet.");
      return;
    }

    const localCode = encodeLocalDeckCode({
      legendarySlug: selectedDeck.legendarySlug,
      cardSlugs: selectedDeck.cardSlugs,
    });

    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback(true);
    } catch {
      window.prompt("Copy deck code", code ?? localCode);
      setCopyFeedback(true);
    }
  }

  async function handleImportDeckCode() {
    if (!selectedDeck) {
      return;
    }

    const value = window.prompt("Paste deck code");
    if (!value) {
      return;
    }

    const importedDeck =
      decodeLocalDeckCode(value) ?? decodeExternalDeckCode(value, cardByExternalId);

    if (!importedDeck) {
      window.alert("Invalid or unsupported deck code.");
      return;
    }

    const uniqueCardSlugs = importedDeck.cardSlugs.filter(
      (slug, index, items) => items.indexOf(slug) === index,
    );

    await updateSelectedDeck((deck) => ({
      ...deck,
      legendarySlug: importedDeck.legendarySlug,
      cardSlugs: uniqueCardSlugs.slice(0, 12),
    }));
  }

  return (
    <section className="grid gap-6 xl:h-full xl:grid-cols-[480px_minmax(0,1fr)] xl:overflow-hidden">
      <aside className="flex flex-col gap-4 xl:sticky xl:top-0 xl:h-full xl:self-start xl:overflow-hidden">
        {!hasClerkSession ? null : !selectedDeck ? (
          canUseCloudDecks ? (
            <div className="space-y-3 rounded-[28px] border border-white/10 bg-[#161616] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                    My Decks
                  </p>
                  <p className="pt-1 text-sm text-white/62">
                    Select a deck to edit cards and legendary.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateDeck}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Create New
                </button>
              </div>

              <div className="space-y-3 xl:max-h-[520px] xl:overflow-y-auto xl:pr-1">
                {sortedDecks.length === 0 ? (
                  <p className="rounded-[20px] border border-dashed border-white/12 bg-[#1b1b1b] px-4 py-4 text-sm text-white/56">
                    No decks yet. Create your first deck to start building.
                  </p>
                ) : (
                  sortedDecks.map((deck) => (
                    <DeckListCard
                      key={deck._id}
                      deck={deck}
                      selected={false}
                      cardBySlug={cardBySlug}
                      editing={editingDeckId === deck._id}
                      renameValue={editingDeckId === deck._id ? renameValue : deck.deckName}
                      onSelect={() => {
                        setSelectedDeckId(deck._id);
                        setEditingDeckId(null);
                        setMulliganOpen(false);
                      }}
                      onRenameChange={setRenameValue}
                      onRenameStart={() => handleRenameStart(deck)}
                      onRenameSave={() => void handleRenameSave(deck._id)}
                      onRenameCancel={() => {
                        setEditingDeckId(null);
                        setRenameValue(deck.deckName);
                      }}
                      onDelete={() => void handleDeleteSavedDeck(deck._id)}
                    />
                  ))
                )}
              </div>
            </div>
          ) : cloudDecksPending ? (
            <div className="rounded-[28px] border border-white/10 bg-[#161616] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                My Decks
              </p>
              <p className="pt-2 text-sm text-white/62">
                Connecting your account to deck storage...
              </p>
            </div>
          ) : (
            <div className="rounded-[28px] border border-amber-400/20 bg-[#161616] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">
                My Decks
              </p>
              <p className="pt-2 text-sm text-white/72">
                Signed in, but Convex deck storage is not authenticated yet.
              </p>
            </div>
          )
        ) : null}

        {!hasClerkSession || Boolean(selectedDeck) ? (
          <>
            {hasClerkSession ? (
              <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-[#161616] px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                    Deck Details
                  </p>
                  <p className="pt-1 text-sm text-white/62">
                    Edit cards, save, and publish this deck.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDeck ? (
                    <>
                      {editingDeckId === selectedDeck._id ? (
                        <button
                          type="button"
                          onClick={() => void handleRenameSave(selectedDeck._id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:bg-black/88"
                          aria-label="Save deck name"
                        >
                          <Image src="/icons/check.png" alt="" width={18} height={18} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRenameStart(selectedDeck)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:bg-black/88"
                          aria-label="Edit deck name"
                        >
                          <Image src="/icons/edit.svg" alt="" width={18} height={18} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteSavedDeck(selectedDeck._id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 transition hover:bg-red-100"
                        aria-label="Delete deck"
                      >
                        <Image src="/icons/trash-1.png" alt="" width={18} height={18} />
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleBackToDecks}
                    className="rounded-full border border-white/14 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/78 transition hover:border-white/24 hover:bg-white/5"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-4">
          <div className="w-full max-w-[160px] shrink-0">
            <DeckFrame
              card={legendaryCard}
              onRemove={() =>
                void updateSelectedDeck((deck) => ({
                  ...deck,
                  legendarySlug: null,
                }))
              }
              highlight
            />
          </div>

          {hasClerkSession ? (
            <div className="mt-2 flex-1 rounded-[24px] border border-white/10 bg-[#1c1c1c] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                Editing Deck
              </p>
              {editingDeckId === selectedDeck?._id && selectedDeck ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleRenameSave(selectedDeck._id);
                    }

                    if (event.key === "Escape") {
                      setEditingDeckId(null);
                      setRenameValue(selectedDeck.deckName);
                    }
                  }}
                  className="mt-3 w-full rounded-full border border-white/14 bg-[#202020] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/32 focus:border-white/24"
                  autoFocus
                />
              ) : (
                <p className="pt-2 text-xl font-semibold text-white">
                  {formatDeckName(deckName)}
                </p>
              )}
              <p className="pt-1 text-sm text-white/62">
                {legendaryCard ? legendaryCard.name : "Choose a legendary card"} ·{" "}
                {cardSlugs.length}/12 cards
              </p>
            </div>
          ) : (
            <div className="mt-2 flex-1 space-y-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => void handleCopyDeckCode()}
                  className="inline-flex h-8 w-8 items-center justify-center bg-transparent transition hover:opacity-85"
                  aria-label="Copy deck code"
                  title="Copy deck code"
                >
                  <Image
                    src={copyFeedback ? "/icons/check.png" : "/icons/export.png"}
                    alt=""
                    width={20}
                    height={20}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void handleImportDeckCode()}
                  className="inline-flex h-8 w-8 items-center justify-center bg-transparent transition hover:opacity-85"
                  aria-label="Import deck code"
                  title="Import deck code"
                >
                  <Image src="/icons/import.png" alt="" width={20} height={20} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDeck) {
                      void handleDeleteSavedDeck(selectedDeck._id);
                    }
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center bg-transparent transition hover:opacity-85"
                  aria-label="Delete deck"
                  title="Delete deck"
                >
                  <Image src="/icons/trash-1.png" alt="" width={20} height={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    Login to Save
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="rounded-full border border-white/12 bg-[#202020] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-[#252525]"
                  >
                    Login to Publish
                  </button>
                </SignInButton>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={handleRandomMulligan}
                  disabled={fullDeck.length === 0}
                  className="w-full rounded-full border border-white/12 bg-[#202020] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-[#252525] disabled:cursor-not-allowed disabled:text-white/38"
                >
                  Generate Mulligan
                </button>

                {mulliganOpen ? (
                  <div className="absolute left-0 top-[calc(100%+0.75rem)] z-20 w-full rounded-[24px] border border-white/10 bg-[#1c1c1c] p-4 shadow-[0_22px_44px_rgba(0,0,0,0.36)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                          Opening Hand
                        </p>
                        <p className="text-sm text-white/64">
                          {mulliganCards.length} card{mulliganCards.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRandomMulligan}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-[#202020] text-lg text-white transition hover:border-white/24 hover:bg-[#252525]"
                          aria-label="Refresh mulligan hand"
                        >
                          ↻
                        </button>
                        <button
                          type="button"
                          onClick={() => setMulliganOpen(false)}
                          className="rounded-full border border-white/12 bg-[#202020] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/24 hover:bg-[#252525]"
                          aria-label="Close mulligan preview"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {mulliganCards.map((card, index) => (
                        <div
                          key={`${card.slug}-${index}`}
                          className="overflow-hidden rounded-[14px] border border-white/10 bg-[#202020]"
                        >
                          <div className="relative aspect-275/400 overflow-hidden">
                            <Image
                              src={`/${card.artPath}`}
                              alt={card.name}
                              fill
                              sizes="120px"
                              className="object-cover"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
            </div>

            {hasClerkSession ? (
            <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  {savedState === "saved" ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  disabled
                  title="Publishing is not wired up yet."
                  className="rounded-full border border-white/12 bg-[#202020] px-4 py-2.5 text-sm font-semibold text-white/45 transition disabled:cursor-not-allowed"
                >
                  Publish
                </button>
              </>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={handleRandomMulligan}
              disabled={fullDeck.length === 0}
              className="w-full rounded-full border border-white/12 bg-[#202020] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-[#252525] disabled:cursor-not-allowed disabled:text-white/38"
            >
              Generate Mulligan
            </button>

            {mulliganOpen ? (
              <div className="absolute left-0 top-[calc(100%+0.75rem)] z-20 w-full rounded-[24px] border border-white/10 bg-[#1c1c1c] p-4 shadow-[0_22px_44px_rgba(0,0,0,0.36)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                      Opening Hand
                    </p>
                    <p className="text-sm text-white/64">
                      {mulliganCards.length} card{mulliganCards.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRandomMulligan}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-[#202020] text-lg text-white transition hover:border-white/24 hover:bg-[#252525]"
                      aria-label="Refresh mulligan hand"
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      onClick={() => setMulliganOpen(false)}
                      className="rounded-full border border-white/12 bg-[#202020] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/24 hover:bg-[#252525]"
                      aria-label="Close mulligan preview"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {mulliganCards.map((card, index) => (
                    <div
                      key={`${card.slug}-${index}`}
                      className="overflow-hidden rounded-[14px] border border-white/10 bg-[#202020]"
                    >
                      <div className="relative aspect-275/400 overflow-hidden">
                        <Image
                          src={`/${card.artPath}`}
                          alt={card.name}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
            </div>
            ) : null}

            <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, index) => {
            const card = deckCards[index] ?? null;

            return (
              <DeckFrame
                key={index}
                card={card}
                onRemove={() =>
                  void updateSelectedDeck((deck) => ({
                    ...deck,
                    cardSlugs: deck.cardSlugs.filter(
                      (_, currentIndex) => currentIndex !== index,
                    ),
                  }))
                }
                compact
              />
            );
          })}
            </div>
          </>
        ) : hasClerkSession ? (
          <div className="rounded-[28px] border border-white/10 bg-[#161616] px-4 py-5 text-sm text-white/58 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
            Click a deck to enter the edit view and modify cards, save, or publish.
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-0 flex-col gap-4 xl:min-h-0">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[24px] border border-white/12 bg-[#1c1c1c] shadow-[0_22px_44px_rgba(0,0,0,0.32)] ring-1 ring-white/5">
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
                    className="rounded-full border border-white/10 bg-[#202020] px-4 py-2 text-[0.7rem] font-semibold text-white/84 transition hover:border-white/24 hover:bg-[#252525]"
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
                              setActiveRarities((current) => toggleValue(current, rarity))
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
                            className="w-full whitespace-nowrap py-[8px]! px-3 text-center text-[0.8rem] leading-none"
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

        <div className="flex-1 min-h-0 overflow-y-auto rounded-[32px] border border-white/10 bg-[#1c1c1c] p-5 pb-8 pr-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
