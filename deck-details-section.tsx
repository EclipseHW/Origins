"use client";

import Image from "next/image";
import { STAGE_BORDER_STYLE, STAGE_ROW_FILL_GRADIENT } from "@/components/deckbuilder/constants";
import { type DeckDoc, type DeckListByClassGroup } from "@/components/deckbuilder/types";
import { formatValue, getDeckValueTextClass } from "@/components/deckbuilder/utils";
import { type ShowdownCard, type Stage } from "@/lib/showdown-cards";

type DeckDetailsSectionProps = {
  selectedDeck: DeckDoc | null;
  onBackToDecks: () => void;
  isRenamingSelectedDeck: boolean;
  selectedDeckNameDraft: string;
  onSelectedDeckNameDraftChange: (value: string) => void;
  onSaveSelectedDeck: () => void;
  onBeginRenameSelectedDeck: () => void;
  onDeleteSelectedDeck: () => void;
  isSaving: boolean;
  stageTotals: Record<Stage, number>;
  deckSize: number;
  deckMaxCards: number;
  deckListByClass: DeckListByClassGroup[];
  onRemoveCard: (card: ShowdownCard, currentCount: number) => void;
  onTogglePublishSelectedDeck: () => void;
  publishBlockedByDeckSize: boolean;
  deckMinPlayableCards: number;
};

export function DeckDetailsSection({
  selectedDeck,
  onBackToDecks,
  isRenamingSelectedDeck,
  selectedDeckNameDraft,
  onSelectedDeckNameDraftChange,
  onSaveSelectedDeck,
  onBeginRenameSelectedDeck,
  onDeleteSelectedDeck,
  isSaving,
  stageTotals,
  deckSize,
  deckMaxCards,
  deckListByClass,
  onRemoveCard,
  onTogglePublishSelectedDeck,
  publishBlockedByDeckSize,
  deckMinPlayableCards,
}: DeckDetailsSectionProps) {
  const deckListIsEmpty = deckListByClass.length === 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1318]/85 p-3">
      {!selectedDeck ? (
        <p className="text-sm text-ink-500">Select or create a deck to continue.</p>
      ) : (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBackToDecks}
              className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:border-chip-500/40 hover:text-chip-300"
              aria-label="Back to decks"
            >
              Back
            </button>
            {!isRenamingSelectedDeck ? (
              <button
                type="button"
                onClick={onDeleteSelectedDeck}
                className="rounded p-1 transition opacity-90 hover:opacity-100"
                aria-label={`Delete ${selectedDeck.name}`}
              >
                <Image src="/icons/x.svg" alt="Delete" width={20} height={20} className="h-5 w-5" />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {isRenamingSelectedDeck ? (
              <div className="relative flex-1">
                <input
                  value={selectedDeckNameDraft}
                  onChange={(event) => onSelectedDeckNameDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onSaveSelectedDeck();
                    }
                  }}
                  className="h-9 w-full rounded border border-white/15 bg-transparent px-2 pr-10 text-sm font-semibold uppercase tracking-[0.18em] text-ink-300 focus:border-chip-400 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onSaveSelectedDeck}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 transition opacity-90 hover:opacity-100 disabled:opacity-50"
                  aria-label="Save deck name"
                  disabled={isSaving}
                >
                  <Image src="/icons/check.svg" alt="Save" width={20} height={20} className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <p className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-semibold text-ink-300">
                  {selectedDeck.name}
                </p>
                <button
                  type="button"
                  onClick={onBeginRenameSelectedDeck}
                  className="ml-auto rounded p-1 transition opacity-90 hover:opacity-100"
                  aria-label="Edit deck name"
                >
                  <Image src="/icons/edit.svg" alt="Edit" width={20} height={20} className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {isSaving ? (
            <div className="mt-1 text-right text-xs text-slate-400">Saving...</div>
          ) : null}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-ink-300">
        <div className="flex items-center gap-0.5">
          <div className="flex w-8 items-center justify-center gap-0.5 py-1">
            <span className="h-2.5 w-2.5 bg-slate-400" />
            <span className="w-[1.1rem] text-center tabular-nums">{stageTotals.Universal}</span>
          </div>
          <div className="flex w-8 items-center justify-center gap-0.5 py-1">
            <span className="h-2.5 w-2.5 bg-sky-500" />
            <span className="w-[1.1rem] text-center tabular-nums">{stageTotals.Preflop}</span>
          </div>
          <div className="flex w-8 items-center justify-center gap-0.5 py-1">
            <span className="h-2.5 w-2.5 bg-amber-400" />
            <span className="w-[1.1rem] text-center tabular-nums">{stageTotals.Flop}</span>
          </div>
          <div className="flex w-8 items-center justify-center gap-0.5 py-1">
            <span className="h-2.5 w-2.5 bg-rose-500" />
            <span className="w-[1.1rem] text-center tabular-nums">{stageTotals.River}</span>
          </div>
        </div>
        <span className="rounded border border-chip-500/40 bg-black/30 px-2 py-1 font-semibold text-chip-300">
          {deckSize}/{deckMaxCards}
        </span>
      </div>

      <div className="mt-2">
        {deckListIsEmpty ? (
          <p className="text-sm text-ink-500">No cards added yet.</p>
        ) : (
          <div className="space-y-1">
            {deckListByClass.map(({ cardClass, entries }) => {
              const classTotal = entries.reduce((sum, entry) => sum + entry.count, 0);
              return (
                <div key={`class-group-${cardClass}`} className="space-y-0.5">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {cardClass} ({classTotal})
                  </p>
                  <ul className="space-y-0.5">
                    {entries.map(({ card, count }) => (
                      <li
                        key={`deck-row-${card.id}`}
                        className={`overflow-hidden rounded-xl border-2 shadow-[0_8px_14px_rgba(0,0,0,0.35)] ${STAGE_BORDER_STYLE[card.stage]}`}
                      >
                        <button
                          type="button"
                          onClick={() => onRemoveCard(card, count)}
                          aria-label={`Remove ${card.name} from deck`}
                          className="group relative block h-6 w-full select-none"
                        >
                          <Image
                            src={card.imagePath}
                            alt={card.name}
                            fill
                            sizes="320px"
                            className="object-cover object-right transition duration-300 group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-0 bg-linear-to-r from-black/45 via-black/60 to-black/82" />
                          <div
                            className="absolute inset-0"
                            style={{ backgroundImage: STAGE_ROW_FILL_GRADIENT[card.stage] }}
                          />

                          <span className="absolute inset-y-0 left-0 flex w-5 items-center justify-center rounded-r-md bg-black/70 text-xs font-bold leading-none text-slate-100">
                            {count}
                          </span>
                          <span className={`absolute inset-y-0 right-0 flex w-7 items-center justify-center rounded-l-md text-xs font-black leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] ${getDeckValueTextClass(card.value)}`}>
                            {formatValue(card.value)}
                          </span>

                          <div className="absolute inset-0 flex items-center pl-6 pr-9">
                            <p className="truncate text-left text-xs font-semibold leading-none text-slate-100">
                              {card.name}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDeck ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSaveSelectedDeck}
            className="rounded-full border border-chip-500/40 px-3 py-1 text-xs font-semibold text-chip-300 transition hover:border-chip-400 hover:bg-chip-500/20 disabled:opacity-50"
            aria-label="Save deck"
            disabled={isSaving}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onTogglePublishSelectedDeck}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              selectedDeck.isPublished
                ? "border-emerald-500/45 bg-emerald-500/20 text-emerald-200 hover:border-emerald-400"
                : "border-sky-500/45 bg-sky-500/15 text-sky-200 hover:border-sky-400"
            }`}
            aria-label={selectedDeck.isPublished ? "Unpublish deck" : "Publish deck"}
            title={
              publishBlockedByDeckSize
                ? `Need at least ${deckMinPlayableCards} cards to publish`
                : undefined
            }
            disabled={isSaving || publishBlockedByDeckSize}
          >
            {selectedDeck.isPublished ? "Unpublish" : "Publish"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
