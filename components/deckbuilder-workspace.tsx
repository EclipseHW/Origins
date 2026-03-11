"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDeckCache } from "@/components/deck-cache-provider";
import { Slider } from "@/components/ui/slider";
import type { CardDefinition } from "@/lib/cards";
import {
  decodeExternalDeckCode,
  decodeLocalDeckCode,
  encodeExternalDeckCode,
  encodeLocalDeckCode,
  type PortableDeckState,
} from "@/lib/deck-code";
import { getDeckFingerprint } from "@/lib/deck-fingerprint";
import {
  DECK_ARCHETYPE_OPTIONS,
  type DeckArchetype,
} from "@/lib/deck-archetypes";
import {
  normalizeDeckRecord,
  type DeckDraft,
  type DeckRecord,
} from "@/lib/deck-types";
import {
  ALIGNMENT_OPTIONS,
  KEYWORD_OPTIONS,
  RARITY_OPTIONS,
} from "@/lib/library-types";

const BUILDER_KIND_OPTIONS = ["Unit", "Spell"] as const;
const EMPTY_CARD_SLUGS: string[] = [];
type BuilderKind = (typeof BUILDER_KIND_OPTIONS)[number];
type SavedState = "idle" | "saved";

const iconActionButtonBaseClass =
  "inline-flex items-center justify-center rounded-full bg-transparent text-white/82 opacity-84 transition-[background-color,color,opacity,transform] duration-150 hover:bg-white/10 hover:text-white hover:opacity-100 focus-visible:bg-white/10 focus-visible:text-white focus-visible:opacity-100 focus-visible:outline-none";
const iconDeleteButtonBaseClass =
  "inline-flex items-center justify-center rounded-full bg-transparent text-red-300 opacity-90 transition-[background-color,color,opacity,transform] duration-150 hover:bg-red-500/14 hover:text-red-200 hover:opacity-100 focus-visible:bg-red-500/14 focus-visible:text-red-200 focus-visible:opacity-100 focus-visible:outline-none";
const savedDeckActionButtonClass =
  `${iconActionButtonBaseClass} h-8 w-8`;
const savedDeckDeleteButtonClass =
  `${iconDeleteButtonBaseClass} h-8 w-8`;
const deckViewToolbarButtonClass =
  `${iconActionButtonBaseClass} h-8 w-8 shrink-0 self-center`;
const deckViewToolbarDeleteButtonClass =
  `${iconDeleteButtonBaseClass} h-8 w-8 shrink-0 self-center`;

type OptimisticDeck = DeckDraft & {
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
      archetype: DeckArchetype | null;
	},
	void
>("decks:update");
const deleteDeckReference = makeFunctionReference<
  "mutation",
  { deckId: string },
  void
>("decks:remove");
const publishDeckReference = makeFunctionReference<
  "mutation",
  { deckId: string },
  void
>("decks:publish");
const hasPublishedDuplicateReference = makeFunctionReference<
  "query",
  { deckFingerprint: string; excludeDeckId?: string },
  boolean
>("decks:hasPublishedDuplicate");
const unpublishDeckReference = makeFunctionReference<
  "mutation",
  { deckId: string },
  void
>("decks:unpublish");
const PENDING_BUILDER_IMPORT_STORAGE_KEY = "origins:pending-builder-import";
const PENDING_AUTH_DECK_STORAGE_KEY = "origins:pending-auth-deck";

type PendingAuthAction = "save" | "publish";
type PendingAuthDeckTransfer = {
  action: PendingAuthAction;
  deck: PortableDeckState;
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
    archetype: null,
    publisherName: null,
    publisherUsername: null,
    publishedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function toDeckDraft(deck: DeckDraft): DeckDraft {
  return {
    deckName: deck.deckName,
    legendarySlug: deck.legendarySlug,
    cardSlugs: [...deck.cardSlugs],
    archetype: deck.archetype,
  };
}

function deckDraftsMatch(left: DeckDraft, right: DeckDraft): boolean {
  return (
    left.deckName === right.deckName &&
    left.legendarySlug === right.legendarySlug &&
    left.archetype === right.archetype &&
    left.cardSlugs.length === right.cardSlugs.length &&
    left.cardSlugs.every((slug, index) => slug === right.cardSlugs[index])
  );
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

function sortDeckCardSlugs(
  cardSlugs: string[],
  cardBySlug: Record<string, CardDefinition>,
): string[] {
  return [...cardSlugs].sort((leftSlug, rightSlug) => {
    const leftCard = cardBySlug[leftSlug];
    const rightCard = cardBySlug[rightSlug];

    if (!leftCard || !rightCard) {
      return leftSlug.localeCompare(rightSlug);
    }

    const leftTypePriority =
      leftCard.cardType === "Unit" ? 0 : leftCard.cardType === "Spell" ? 1 : 2;
    const rightTypePriority =
      rightCard.cardType === "Unit" ? 0 : rightCard.cardType === "Spell" ? 1 : 2;

    if (leftTypePriority !== rightTypePriority) {
      return leftTypePriority - rightTypePriority;
    }

    if (leftCard.mana !== rightCard.mana) {
      return leftCard.mana - rightCard.mana;
    }

    return leftCard.name.localeCompare(rightCard.name);
  });
}

function normalizeDeckCardOrder<T extends { cardSlugs: string[] }>(
  deck: T,
  cardBySlug: Record<string, CardDefinition>,
): T {
  return {
    ...deck,
    cardSlugs: sortDeckCardSlugs(deck.cardSlugs, cardBySlug),
  };
}

function sanitizeImportedDeck(
  deck: PortableDeckState,
  cardBySlug: Record<string, CardDefinition>,
): PortableDeckState {
  const uniqueCardSlugs = deck.cardSlugs.filter(
    (slug, index, items) => items.indexOf(slug) === index,
  );

  return {
    deckName: deck.deckName,
    legendarySlug: deck.legendarySlug,
    cardSlugs: sortDeckCardSlugs(uniqueCardSlugs.slice(0, 12), cardBySlug),
    archetype: deck.archetype,
  };
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
      role={editing ? undefined : "button"}
      tabIndex={editing ? undefined : 0}
      onClick={editing ? undefined : onSelect}
      onKeyDown={(event) => {
        if (editing) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-2.5 shadow-[0_16px_28px_rgba(0,0,0,0.18)] transition ${
        selected
          ? "border-[#e0c15a] bg-[linear-gradient(135deg,#231e12_0%,#17130d_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_0_0_1px_rgba(224,193,90,0.18)]"
          : "border-[#2a2a2a] bg-[linear-gradient(135deg,#1d1f26_0%,#14161c_100%)] hover:border-[#343844]"
      }`}
      aria-label={editing ? undefined : `Open ${formatDeckName(deck.deckName)}`}
    >
	      <div className="relative h-[62px] w-[46px] shrink-0 overflow-hidden rounded-none border border-white/10 bg-[#171717] shadow-[0_10px_18px_rgba(0,0,0,0.24)]">
        {previewCard ? (
          <Image
            src={`/${previewCard.artPath}`}
            alt={previewCard.name}
            fill
            sizes="46px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(255,255,255,0)_58%),linear-gradient(180deg,#1d1d1d_0%,#121212_100%)]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
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
            className="w-full border-none bg-transparent px-0 py-0 text-[1.08rem] font-semibold text-white outline-none placeholder:text-white/28"
          />
        ) : (
          <p className="truncate text-[1.08rem] font-semibold tracking-tight text-white">
            {formatDeckName(deck.deckName)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {editing ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRenameSave();
            }}
            className={savedDeckActionButtonClass}
            aria-label={`Save ${formatDeckName(deck.deckName)}`}
          >
            <Check size={18} strokeWidth={2.2} color="#34d399" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRenameStart();
            }}
            className={savedDeckActionButtonClass}
            aria-label={`Edit ${formatDeckName(deck.deckName)}`}
          >
            <Pencil size={18} strokeWidth={2.2} />
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className={savedDeckDeleteButtonClass}
          aria-label={`Delete ${formatDeckName(deck.deckName)}`}
        >
          <Trash2 size={18} strokeWidth={2.2} color="#f87171" />
        </button>
      </div>
    </div>
  );
}

export function DeckbuilderWorkspace({
  cards,
}: {
  cards: CardDefinition[];
}) {
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, user } = useUser();
  const { isLoading: convexAuthLoading, isAuthenticated: convexAuthenticated } =
    useConvexAuth();
  const { decksByUserId, setCachedDecks } = useDeckCache();
  const hasClerkSession = isLoaded && isSignedIn;
  const isSignedOut = isLoaded && !isSignedIn;
  const canUseCloudDecks = hasClerkSession && convexAuthenticated;
  const authBooting = !isLoaded || (hasClerkSession && convexAuthLoading);
  const currentUserId = user?.id ?? null;
  const signedInDecks = useQuery(
    listMyDecksReference,
    canUseCloudDecks ? {} : "skip",
  );
  const cachedSignedInDecks = currentUserId
    ? decksByUserId[currentUserId]
    : undefined;
  const hydratedSignedInDecks = signedInDecks ?? cachedSignedInDecks;
  const cloudDecksLoading =
    canUseCloudDecks && hydratedSignedInDecks === undefined;
  const createDeckMutation = useMutation(createDeckReference);
  const updateDeckMutation = useMutation(updateDeckReference);
  const deleteDeckMutation = useMutation(deleteDeckReference);
  const publishDeckMutation = useMutation(publishDeckReference);
  const unpublishDeckMutation = useMutation(unpublishDeckReference);
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
  const [scratchDeck, setScratchDeck] = useState<DeckRecord | null>(null);
  const [pendingImportedDeckCode, setPendingImportedDeckCode] = useState<string | null>(
    () =>
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_BUILDER_IMPORT_STORAGE_KEY)
        : null,
  );
  const [pendingAuthDeckTransfer, setPendingAuthDeckTransfer] =
    useState<PendingAuthDeckTransfer | null>(() => {
      if (typeof window === "undefined") {
        return null;
      }

      try {
        const rawValue = window.sessionStorage.getItem(
          PENDING_AUTH_DECK_STORAGE_KEY,
        );

        return rawValue
          ? (JSON.parse(rawValue) as PendingAuthDeckTransfer)
          : null;
      } catch {
        return null;
      }
    });
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savedState, setSavedState] = useState<SavedState>("idle");
  const [mulliganHand, setMulliganHand] = useState<string[]>([]);
  const [mulliganOpen, setMulliganOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [optimisticDecks, setOptimisticDecks] = useState<
    Record<string, OptimisticDeck>
  >({});
  const optimisticDecksRef = useRef<Record<string, OptimisticDeck>>({});
  const savedDecksRef = useRef<DeckRecord[]>([]);
	  const cloudSaveTimersRef = useRef<Record<string, number>>({});
	  const pendingCloudSavesRef = useRef<Record<string, DeckDraft>>({});
	  const pendingCloudSaveStateRef = useRef<
	    Partial<Record<string, SavedState>>
	  >({});
	  const inFlightCloudSavesRef = useRef<Record<string, boolean>>({});
	  const cloudSaveWaitersRef = useRef<Record<string, Array<() => void>>>({});
      const importedDeckCodeRef = useRef<string | null>(null);

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

  useEffect(() => {
    optimisticDecksRef.current = optimisticDecks;
  }, [optimisticDecks]);

  useEffect(() => {
    if (!pendingAuthDeckTransfer || !canUseCloudDecks) {
      return;
    }

    const restoreDeckAfterAuth = async () => {
      const restoredDeck = sanitizeImportedDeck(
        pendingAuthDeckTransfer.deck,
        cardBySlug,
      );
      const matchingDeck =
        savedDecksRef.current.find((deck) =>
          deckDraftsMatch(toDeckDraft(deck), restoredDeck),
        ) ?? null;

      if (matchingDeck) {
        setScratchDeck(null);
        setSelectedDeckId(matchingDeck._id);
        setEditingDeckId(null);
        setRenameValue(matchingDeck.deckName);
        setSavedState("idle");
        setMulliganHand([]);
        setMulliganOpen(false);

        if (
          pendingAuthDeckTransfer.action === "publish" &&
          matchingDeck.publishedAt === null &&
          matchingDeck.legendarySlug &&
          matchingDeck.cardSlugs.length === 12
        ) {
          await publishDeckMutation({ deckId: matchingDeck._id });
        }
      } else {
        const nextDeckId = await createDeckMutation({
          deckName: restoredDeck.deckName,
        });

        await updateDeckMutation({
          deckId: nextDeckId,
          deckName: restoredDeck.deckName,
          legendarySlug: restoredDeck.legendarySlug,
          cardSlugs: restoredDeck.cardSlugs,
          archetype: restoredDeck.archetype,
        });

        if (
          pendingAuthDeckTransfer.action === "publish" &&
          restoredDeck.legendarySlug &&
          restoredDeck.cardSlugs.length === 12
        ) {
          await publishDeckMutation({ deckId: nextDeckId });
        }

        setScratchDeck(null);
        setSelectedDeckId(nextDeckId);
        setEditingDeckId(null);
        setRenameValue(restoredDeck.deckName);
        setSavedState(
          pendingAuthDeckTransfer.action === "save" ? "saved" : "idle",
        );
        setMulliganHand([]);
        setMulliganOpen(false);
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_AUTH_DECK_STORAGE_KEY);
      }
      setPendingAuthDeckTransfer(null);
    };

    void restoreDeckAfterAuth();
  }, [canUseCloudDecks, cardBySlug, createDeckMutation, pendingAuthDeckTransfer, publishDeckMutation, updateDeckMutation]);

	  useEffect(() => {
	    if (!canUseCloudDecks || !currentUserId || signedInDecks === undefined) {
	      return;
	    }

	    setCachedDecks(
	      currentUserId,
	      signedInDecks.map((deck) => normalizeDeckRecord(deck)),
	    );
	  }, [canUseCloudDecks, currentUserId, setCachedDecks, signedInDecks]);

	  const savedDecks = useMemo(() => {
	    if (isSignedOut) {
	      return guestDecks.map((deck) => normalizeDeckCardOrder(deck, cardBySlug));
	    }

    if (!hasClerkSession) {
      return [];
    }

    if (!canUseCloudDecks) {
      return [];
    }

		    return (hydratedSignedInDecks ?? []).map((deck) => {
		      const baseDeck = normalizeDeckRecord(deck);
		      const optimisticDeck = optimisticDecks[deck._id];

		      return optimisticDeck
		        ? normalizeDeckCardOrder(
		            normalizeDeckRecord({ ...baseDeck, ...optimisticDeck }),
		            cardBySlug,
		          )
		        : normalizeDeckCardOrder(baseDeck, cardBySlug);
		    });
		  }, [canUseCloudDecks, guestDecks, hasClerkSession, hydratedSignedInDecks, isSignedOut, optimisticDecks, cardBySlug]);

  useEffect(() => {
    savedDecksRef.current = savedDecks;
  }, [savedDecks]);

  useEffect(() => {
    if (!canUseCloudDecks) {
      setOptimisticDecks((current) => {
        if (Object.keys(current).length === 0) {
          return current;
        }

        optimisticDecksRef.current = {};
        return {};
      });
      return;
    }

    if (!signedInDecks) {
      return;
    }

    setOptimisticDecks((current) => {
      let changed = false;
      const next = { ...current };

      for (const [deckId, optimisticDeck] of Object.entries(current)) {
	        const serverDeck = signedInDecks.find((deck) => deck._id === deckId);
	        if (!serverDeck || deckDraftsMatch(serverDeck, optimisticDeck)) {
	          delete next[deckId];
	          changed = true;
	        }
      }

      if (!changed) {
        return current;
      }

      optimisticDecksRef.current = next;
      return next;
    });
  }, [canUseCloudDecks, signedInDecks]);

  useEffect(
    () => () => {
      Object.values(cloudSaveTimersRef.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
    },
    [],
  );
  const sortedDecks = useMemo(
    () => [...savedDecks].sort((left, right) => right.updatedAt - left.updatedAt),
    [savedDecks],
  );
  const effectiveSelectedDeckId = isSignedOut
    ? selectedDeckId && sortedDecks.some((deck) => deck._id === selectedDeckId)
      ? selectedDeckId
      : sortedDecks[0]?._id ?? null
    : selectedDeckId && sortedDecks.some((deck) => deck._id === selectedDeckId)
      ? selectedDeckId
      : null;
  const selectedSavedDeck = useMemo(() => {
    if (sortedDecks.length === 0 || !effectiveSelectedDeckId) {
      return null;
    }

    return sortedDecks.find((deck) => deck._id === effectiveSelectedDeckId) ?? null;
  }, [effectiveSelectedDeckId, sortedDecks]);
  const selectedDeck =
    scratchDeck && selectedDeckId === scratchDeck._id
      ? scratchDeck
      : selectedSavedDeck;
  const incomingDeckCode = pendingImportedDeckCode ?? searchParams.get("deck");
  const importResolutionPending =
    Boolean(incomingDeckCode) &&
    importedDeckCodeRef.current !== incomingDeckCode;
  const workspaceLoading =
    importResolutionPending ||
    (!selectedDeck &&
      (authBooting || (hasClerkSession && canUseCloudDecks && cloudDecksLoading)));
  const visibleSelectedDeck = importResolutionPending ? null : selectedDeck;
  const selectedDeckFingerprint =
    selectedDeck?.legendarySlug && selectedDeck.cardSlugs.length === 12
      ? getDeckFingerprint(selectedDeck.legendarySlug, selectedDeck.cardSlugs)
      : null;
  const duplicatePublishedDeckExists = useQuery(
    hasPublishedDuplicateReference,
    selectedDeckFingerprint && !selectedDeck?.publishedAt
      ? {
          deckFingerprint: selectedDeckFingerprint,
          excludeDeckId: selectedDeck?._id,
        }
      : "skip",
  );
  const publishBlockedByDuplicate =
    !visibleSelectedDeck?.publishedAt && duplicatePublishedDeckExists === true;
	  const legendarySlug = visibleSelectedDeck?.legendarySlug ?? null;
	  const cardSlugs = visibleSelectedDeck?.cardSlugs ?? EMPTY_CARD_SLUGS;
      const canPublishSelectedDeck =
        Boolean(visibleSelectedDeck?.legendarySlug) && cardSlugs.length === 12;
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

      useEffect(() => {
        const sessionDeckCode = pendingImportedDeckCode;
        const deckCode = sessionDeckCode ?? searchParams.get("deck");
        if (!deckCode || importedDeckCodeRef.current === deckCode) {
          return;
        }

        const importedDeck =
          decodeLocalDeckCode(deckCode) ??
          decodeExternalDeckCode(deckCode, cardByExternalId);

        if (!importedDeck) {
          importedDeckCodeRef.current = deckCode;
          if (sessionDeckCode && typeof window !== "undefined") {
            window.sessionStorage.removeItem(PENDING_BUILDER_IMPORT_STORAGE_KEY);
            setPendingImportedDeckCode(null);
          } else if (typeof window !== "undefined") {
            window.history.replaceState(null, "", "/deckbuilder");
          }
          return;
        }

        const sanitizedDeck = sanitizeImportedDeck(importedDeck, cardBySlug);

        if (hasClerkSession && !canUseCloudDecks) {
          return;
        }

        importedDeckCodeRef.current = deckCode;

        const applyImportedDeck = async () => {
          const matchingDeck =
            (scratchDeck &&
            deckDraftsMatch(toDeckDraft(scratchDeck), sanitizedDeck)
              ? scratchDeck
              : null) ??
            savedDecksRef.current.find((deck) =>
              deckDraftsMatch(toDeckDraft(deck), sanitizedDeck),
            ) ??
            null;

          if (matchingDeck) {
            setScratchDeck((current) =>
              current && current._id === matchingDeck._id ? current : null,
            );
            setSelectedDeckId(matchingDeck._id);
            setEditingDeckId(null);
            setRenameValue(matchingDeck.deckName);
            setSavedState("idle");
            setMulliganHand([]);
            setMulliganOpen(false);
            if (sessionDeckCode && typeof window !== "undefined") {
              window.sessionStorage.removeItem(PENDING_BUILDER_IMPORT_STORAGE_KEY);
              setPendingImportedDeckCode(null);
            } else if (typeof window !== "undefined") {
              window.history.replaceState(null, "", "/deckbuilder");
            }
            return;
          }

          if (canUseCloudDecks) {
            const nextScratchDeck = normalizeDeckRecord({
              ...createEmptyDeck(sanitizedDeck.deckName),
              deckName: sanitizedDeck.deckName,
              legendarySlug: sanitizedDeck.legendarySlug,
              cardSlugs: sanitizedDeck.cardSlugs,
              archetype: sanitizedDeck.archetype,
            });

            setScratchDeck(nextScratchDeck);
            setSelectedDeckId(nextScratchDeck._id);
            setEditingDeckId(null);
            setRenameValue(sanitizedDeck.deckName);
          } else if (!hasClerkSession) {
            const nextDeck = normalizeDeckRecord({
              ...createEmptyDeck(sanitizedDeck.deckName),
              deckName: sanitizedDeck.deckName,
              legendarySlug: sanitizedDeck.legendarySlug,
              cardSlugs: sanitizedDeck.cardSlugs,
              archetype: sanitizedDeck.archetype,
            });

            setGuestDecks((current) => [nextDeck, ...current]);
            setSelectedDeckId(nextDeck._id);
            setEditingDeckId(null);
            setRenameValue(nextDeck.deckName);
          }

          setSavedState("idle");
          setMulliganHand([]);
          setMulliganOpen(false);
          if (sessionDeckCode && typeof window !== "undefined") {
            window.sessionStorage.removeItem(PENDING_BUILDER_IMPORT_STORAGE_KEY);
            setPendingImportedDeckCode(null);
          } else if (typeof window !== "undefined") {
            window.history.replaceState(null, "", "/deckbuilder");
          }
        };

        void applyImportedDeck();
		      }, [
		        cardByExternalId,
	        cardBySlug,
        canUseCloudDecks,
        hasClerkSession,
        pendingImportedDeckCode,
        scratchDeck,
        searchParams,
      ]);

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

  function resolveCloudSaveWaiters(deckId: string) {
    const waiters = cloudSaveWaitersRef.current[deckId];
    if (!waiters) {
      return;
    }

    delete cloudSaveWaitersRef.current[deckId];
    waiters.forEach((resolve) => resolve());
  }

  function waitForCloudSave(deckId: string) {
    if (
      !inFlightCloudSavesRef.current[deckId] &&
      !pendingCloudSavesRef.current[deckId] &&
      !cloudSaveTimersRef.current[deckId]
    ) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      cloudSaveWaitersRef.current[deckId] = [
        ...(cloudSaveWaitersRef.current[deckId] ?? []),
        resolve,
      ];
    });
  }

  function getCurrentDeck(deckId: string) {
    const baseDeck =
      savedDecksRef.current.find((deck) => deck._id === deckId) ?? null;
    if (!baseDeck) {
      return null;
    }

    const optimisticDeck = optimisticDecksRef.current[deckId];
    return optimisticDeck ? { ...baseDeck, ...optimisticDeck } : baseDeck;
  }

  function setOptimisticDeck(deckId: string, deck: DeckDraft) {
    const nextOptimisticDeck: OptimisticDeck = {
      ...toDeckDraft(deck),
      updatedAt: Date.now(),
    };

    setOptimisticDecks((current) => {
      const next = {
        ...current,
        [deckId]: nextOptimisticDeck,
      };

      optimisticDecksRef.current = next;
      return next;
    });
  }

  function clearOptimisticDeck(deckId: string) {
    setOptimisticDecks((current) => {
      if (!(deckId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[deckId];
      optimisticDecksRef.current = next;
      return next;
    });
  }

  async function flushCloudSave(deckId: string): Promise<void> {
    const timer = cloudSaveTimersRef.current[deckId];
    if (timer) {
      window.clearTimeout(timer);
      delete cloudSaveTimersRef.current[deckId];
    }

    if (inFlightCloudSavesRef.current[deckId]) {
      await waitForCloudSave(deckId);
      return;
    }

    const draft = pendingCloudSavesRef.current[deckId];
    if (!draft) {
      return;
    }

    delete pendingCloudSavesRef.current[deckId];
    const nextSavedState = pendingCloudSaveStateRef.current[deckId];
    delete pendingCloudSaveStateRef.current[deckId];
    inFlightCloudSavesRef.current[deckId] = true;

	    try {
	      await updateDeckMutation({
	        deckId,
	        deckName: draft.deckName,
	        legendarySlug: draft.legendarySlug,
	        cardSlugs: draft.cardSlugs,
            archetype: draft.archetype,
	      });

      if (nextSavedState) {
        setSavedState(nextSavedState);
      }
    } finally {
      inFlightCloudSavesRef.current[deckId] = false;

      if (pendingCloudSavesRef.current[deckId]) {
        await flushCloudSave(deckId);
      } else {
        resolveCloudSaveWaiters(deckId);
      }
    }
  }

  async function queueCloudSave(
    deckId: string,
    deck: DeckDraft,
    options?: { immediate?: boolean; savedState?: SavedState },
  ) {
    pendingCloudSavesRef.current[deckId] = toDeckDraft(deck);

    if (options?.savedState) {
      pendingCloudSaveStateRef.current[deckId] = options.savedState;
    }

    const existingTimer = cloudSaveTimersRef.current[deckId];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete cloudSaveTimersRef.current[deckId];
    }

    if (options?.immediate) {
      await flushCloudSave(deckId);
      return;
    }

    cloudSaveTimersRef.current[deckId] = window.setTimeout(() => {
      delete cloudSaveTimersRef.current[deckId];
      void flushCloudSave(deckId);
    }, 250);
  }

  async function settleCloudDeck(deckId: string) {
    await flushCloudSave(deckId);
    await waitForCloudSave(deckId);
  }

  async function persistDeck(
    deckId: string,
    updater: (deck: DeckRecord) => DeckRecord,
    options?: { immediate?: boolean; savedState?: SavedState },
  ) {
    if (scratchDeck && scratchDeck._id === deckId) {
      setScratchDeck((current) => {
        if (!current || current._id !== deckId) {
          return current;
        }

        const nextDeck = normalizeDeckCardOrder(
          {
            ...updater(current),
            updatedAt: Date.now(),
          },
          cardBySlug,
        );

        if (options?.savedState) {
          setSavedState(options.savedState);
        } else {
          setSavedState("idle");
        }

        return nextDeck;
      });
      return;
    }

    const deck = getCurrentDeck(deckId);
    if (!deck) {
      return;
    }

	    const nextDeck = normalizeDeckCardOrder(updater(deck), cardBySlug);
	    if (canUseCloudDecks) {
	      const nextDraft = toDeckDraft(nextDeck);
      const draftChanged = !deckDraftsMatch(deck, nextDraft);

      if (!draftChanged && !options?.savedState) {
        return;
      }

      if (draftChanged) {
        setOptimisticDeck(deckId, nextDraft);
        setSavedState("idle");
      }

      await queueCloudSave(deckId, nextDraft, options);
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
    setScratchDeck(null);
    if (canUseCloudDecks) {
      const nextDeckId = await createDeckMutation({ deckName: "" });
      setSelectedDeckId(nextDeckId);
      setEditingDeckId(nextDeckId);
      setRenameValue("");
      setSavedState("idle");
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
    setEditingDeckId(deck._id);
    setRenameValue(deck.deckName);
  }

  function handleBackToDecks() {
    if (scratchDeck && selectedDeckId === scratchDeck._id) {
      setScratchDeck(null);
    }
    setSelectedDeckId(null);
    setEditingDeckId(null);
    setMulliganOpen(false);
  }

  async function handleRenameSave(deckId: string) {
    await persistDeck(deckId, (deck) => ({
      ...deck,
      deckName: renameValue.trim(),
    }), { immediate: true });
    setEditingDeckId(null);
  }

  async function handleDeleteSavedDeck(deckId: string) {
    if (scratchDeck && scratchDeck._id === deckId) {
      const confirmed = window.confirm(
        `Discard ${formatDeckName(scratchDeck.deckName)}?`,
      );
      if (!confirmed) {
        return;
      }

      setScratchDeck(null);
      setSelectedDeckId(null);
      setEditingDeckId(null);
      setSavedState("idle");
      setMulliganHand([]);
      setMulliganOpen(false);
      return;
    }

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
      await settleCloudDeck(deckId);
      await deleteDeckMutation({ deckId });
      clearOptimisticDeck(deckId);
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
    setSavedState("idle");
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

    if (scratchDeck && selectedDeck._id === scratchDeck._id) {
      if (!canUseCloudDecks) {
        return;
      }

      const nextDeckId = await createDeckMutation({
        deckName: scratchDeck.deckName,
      });

      await updateDeckMutation({
        deckId: nextDeckId,
        deckName: scratchDeck.deckName,
        legendarySlug: scratchDeck.legendarySlug,
        cardSlugs: scratchDeck.cardSlugs,
        archetype: scratchDeck.archetype,
      });

      setScratchDeck(null);
      setSelectedDeckId(nextDeckId);
      setSavedState("saved");
      return;
    }

    await persistDeck(selectedDeck._id, (deck) => deck, {
      immediate: true,
      savedState: "saved",
    });
    if (!isSignedIn) {
      setSavedState("idle");
    }
  }

  async function handlePublishDeck() {
    if (!selectedDeck || !canUseCloudDecks) {
      return;
    }

    if (selectedDeck.publishedAt) {
      if (scratchDeck && selectedDeck._id === scratchDeck._id) {
        return;
      }

      await settleCloudDeck(selectedDeck._id);
      await unpublishDeckMutation({ deckId: selectedDeck._id });
      return;
    }

    if (!canPublishSelectedDeck) {
      return;
    }

    if (duplicatePublishedDeckExists) {
      window.alert("An identical published deck already exists.");
      return;
    }

    if (scratchDeck && selectedDeck._id === scratchDeck._id) {
      const nextDeckId = await createDeckMutation({
        deckName: scratchDeck.deckName,
      });

      await updateDeckMutation({
        deckId: nextDeckId,
        deckName: scratchDeck.deckName,
        legendarySlug: scratchDeck.legendarySlug,
        cardSlugs: scratchDeck.cardSlugs,
        archetype: scratchDeck.archetype,
      });

      await publishDeckMutation({ deckId: nextDeckId });
      setScratchDeck(null);
      setSelectedDeckId(nextDeckId);
      setSavedState("idle");
      return;
    }

    await settleCloudDeck(selectedDeck._id);
    await publishDeckMutation({ deckId: selectedDeck._id });
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
          deckName: selectedDeck.deckName,
	      legendarySlug: selectedDeck.legendarySlug,
	      cardSlugs: selectedDeck.cardSlugs,
          archetype: selectedDeck.archetype,
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

	        const sanitizedDeck = sanitizeImportedDeck(importedDeck, cardBySlug);

	    await updateSelectedDeck((deck) => ({
	      ...deck,
	      deckName:
            sanitizedDeck.deckName.trim().length > 0
              ? sanitizedDeck.deckName
              : deck.deckName,
          legendarySlug: sanitizedDeck.legendarySlug,
          cardSlugs: sanitizedDeck.cardSlugs,
          archetype: sanitizedDeck.archetype,
	    }));
	  }

  function prepareGuestDeckAuthTransfer(action: PendingAuthAction) {
    if (hasClerkSession || !selectedDeck || typeof window === "undefined") {
      return;
    }

    const payload: PendingAuthDeckTransfer = {
      action,
      deck: toDeckDraft(selectedDeck),
    };

    window.sessionStorage.setItem(
      PENDING_AUTH_DECK_STORAGE_KEY,
      JSON.stringify(payload),
    );
    setPendingAuthDeckTransfer(payload);
  }

  return (
    <section className="grid gap-6 xl:h-full xl:grid-cols-[480px_minmax(0,1fr)] xl:overflow-hidden">
      <aside className="flex flex-col gap-4 xl:sticky xl:top-0 xl:h-full xl:self-start xl:overflow-hidden">
        {workspaceLoading ? (
            <div className="rounded-[28px] border border-white/10 bg-[#161616] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                Saved Decks
              </p>
              <p className="pt-2 text-sm text-white/62">
                Loading your workspace...
              </p>
            </div>
          ) : isSignedOut || visibleSelectedDeck ? null : canUseCloudDecks && !cloudDecksLoading ? (
            <div className="space-y-3 rounded-[28px] border border-white/10 bg-[#161616] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Saved Decks
                </h1>
                <button
                  type="button"
                  onClick={handleCreateDeck}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Create New
                </button>
              </div>

              <div className="space-y-3 xl:max-h-[620px] xl:overflow-y-auto xl:pr-1">
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
          ) : hasClerkSession ? (
            <div className="rounded-[28px] border border-amber-400/20 bg-[#161616] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">
                Saved Decks
              </p>
              <p className="pt-2 text-sm text-white/72">
                Signed in, but Convex deck storage is not authenticated yet.
              </p>
            </div>
          ) : null}

        {(!importResolutionPending && isSignedOut) || Boolean(visibleSelectedDeck) ? (
          <>
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

	            <div className="mt-2 flex flex-1 flex-col">
	              <div className="flex items-center justify-between gap-3">
	                <div className="flex items-center gap-1">
	                  {hasClerkSession ? (
	                    <button
	                      type="button"
	                      onClick={handleBackToDecks}
	                      className={deckViewToolbarButtonClass}
	                      aria-label="Back to saved decks"
	                    >
	                      <ArrowLeft size={16} strokeWidth={2.2} />
	                    </button>
	                  ) : null}
	                  <button
	                    type="button"
	                    onClick={() => void handleCopyDeckCode()}
	                    className={deckViewToolbarButtonClass}
	                    aria-label="Copy deck code"
	                  >
	                    {copyFeedback ? (
	                      <Check size={16} strokeWidth={2.2} color="#34d399" />
	                    ) : (
	                      <Copy size={16} strokeWidth={2.2} />
	                    )}
	                  </button>
	                  <button
	                    type="button"
	                    onClick={() => void handleImportDeckCode()}
	                    className={deckViewToolbarButtonClass}
	                    aria-label="Import deck code"
	                  >
	                    <Download size={16} strokeWidth={2.2} />
	                  </button>
	                  {hasClerkSession ? (
	                    <button
	                      type="button"
	                      onClick={() => void handleSaveDraft()}
	                      aria-label={savedState === "saved" ? "Saved" : "Save deck"}
	                      className={deckViewToolbarButtonClass}
	                    >
	                      {savedState === "saved" ? (
	                        <Check size={16} strokeWidth={2.4} color="#34d399" />
	                      ) : (
	                        <Save size={16} strokeWidth={2.2} />
	                      )}
	                    </button>
	                  ) : (
	                    <SignInButton mode="modal">
	                      <button
	                        type="button"
                          onClick={() => prepareGuestDeckAuthTransfer("save")}
	                        aria-label="Save deck"
	                        className={deckViewToolbarButtonClass}
	                      >
	                        <Save size={16} strokeWidth={2.2} />
	                      </button>
	                    </SignInButton>
	                  )}
	                  <button
	                    type="button"
	                    onClick={() => {
		                      if (visibleSelectedDeck) {
		                        void handleDeleteSavedDeck(visibleSelectedDeck._id);
		                      }
		                    }}
	                    className={deckViewToolbarDeleteButtonClass}
	                    aria-label="Delete deck"
	                  >
	                    <Trash2 size={16} strokeWidth={2.2} color="#f87171" />
	                  </button>
	                </div>
	                <div className="relative w-26 shrink-0">
	                  <select
		                    value={visibleSelectedDeck?.archetype ?? ""}
	                    onChange={(event) => {
	                      const nextValue = event.target.value;
	                      void updateSelectedDeck((deck) => ({
	                        ...deck,
	                        archetype:
	                          nextValue.length > 0
	                            ? (nextValue as DeckArchetype)
	                            : null,
	                      }));
	                    }}
	                    className="h-8 w-full appearance-none rounded-lg border border-white/12 bg-[#202020] px-2.5 pr-7 text-xs font-medium text-white outline-none transition hover:border-white/24 focus:border-white/28"
	                  >
	                    <option value="">Unassigned</option>
	                    {DECK_ARCHETYPE_OPTIONS.map((option) => (
	                      <option key={option} value={option}>
	                        {option}
	                      </option>
	                    ))}
	                  </select>
	                  <ChevronDown
	                    size={14}
	                    strokeWidth={2.2}
	                    className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-white/68"
	                  />
	                </div>
			              </div>

		              <div className="mt-auto flex flex-col gap-2 pt-4">
	                <div className="relative">
	                  <button
	                    type="button"
	                    onClick={handleRandomMulligan}
	                    disabled={fullDeck.length === 0}
	                    className="w-full rounded-full border border-white/16 bg-transparent px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/28 hover:text-white disabled:cursor-not-allowed disabled:text-white/38"
	                  >
	                    Simulate Hand
	                  </button>

		                  {mulliganOpen ? (
		                    <div className="absolute left-0 top-[calc(100%+0.35rem)] z-20 w-full rounded-[24px] border border-white/10 bg-[#1c1c1c] p-4 shadow-[0_22px_44px_rgba(0,0,0,0.36)]">
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
	                            className="overflow-hidden rounded-none border border-white/10 bg-[#202020]"
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

	                {hasClerkSession ? (
		                  <button
		                    type="button"
		                    onClick={() => void handlePublishDeck()}
		                    disabled={
                        !canUseCloudDecks ||
                        (!visibleSelectedDeck?.publishedAt &&
                          (!canPublishSelectedDeck || publishBlockedByDuplicate))
                      }
                        title={
                          publishBlockedByDuplicate
                            ? "An identical published deck already exists"
                            : undefined
                        }
		                    className="w-full rounded-full border border-[#e0c15a]/50 bg-[#e0c15a]/12 px-4 py-2.5 text-sm font-semibold text-[#e0c15a] transition hover:border-[#e0c15a]/70 hover:bg-[#e0c15a]/20 disabled:cursor-not-allowed disabled:border-white/12 disabled:bg-transparent disabled:text-white/38"
		                  >
	                    {visibleSelectedDeck?.publishedAt ? "Unpublish" : "Publish"}
	                  </button>
		                ) : (
		                  <SignInButton mode="modal">
		                    <button
		                      type="button"
                          onClick={() => prepareGuestDeckAuthTransfer("publish")}
		                      className="w-full rounded-full border border-[#e0c15a]/50 bg-[#e0c15a]/12 px-4 py-2.5 text-sm font-semibold text-[#e0c15a] transition hover:border-[#e0c15a]/70 hover:bg-[#e0c15a]/20"
		                    >
	                      Publish
	                    </button>
	                  </SignInButton>
	                )}
	              </div>
		            </div>
		            </div>

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
        ) : null}
      </aside>

      <div className="flex min-h-0 flex-col gap-4 xl:min-h-0">
        {importResolutionPending ? (
          <>
            <div className="rounded-[24px] border border-white/12 bg-[#1c1c1c] px-4 py-3 shadow-[0_22px_44px_rgba(0,0,0,0.32)] ring-1 ring-white/5">
              <p className="text-sm text-white/62">Opening deck...</p>
            </div>
            <div className="flex-1 min-h-0 rounded-[32px] border border-white/10 bg-[#1c1c1c] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]" />
          </>
        ) : (
          <>
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
                        className="rounded-full border border-white/10 bg-[#202020] px-4 py-2 text-[0.8rem] font-semibold text-white/84 transition hover:border-white/24 hover:bg-[#252525]"
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
                                className="w-full whitespace-nowrap py-[8px]! px-3 text-center text-[0.7rem] leading-none"
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
          </>
        )}
      </div>
    </section>
  );
}
