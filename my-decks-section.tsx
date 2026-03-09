"use client";

import { type Id } from "@/convex/_generated/dataModel";
import { DECK_MAX_CARDS } from "@/components/deckbuilder/constants";
import { type DeckDoc } from "@/components/deckbuilder/types";

type MyDecksSectionProps = {
  decks: DeckDoc[];
  selectedDeck: DeckDoc | null;
  pendingDeckCounts: Record<string, Record<string, number>>;
  onCreateDeck: () => void;
  onSelectDeck: (deckId: Id<"decks">) => void;
};

export function MyDecksSection({
  decks,
  selectedDeck,
  pendingDeckCounts,
  onCreateDeck,
  onSelectDeck,
}: MyDecksSectionProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1318]/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-300">My Decks</h2>
        <button
          type="button"
          onClick={onCreateDeck}
          className="rounded-full border border-chip-500/40 px-3 py-1 text-xs font-semibold text-chip-300 transition hover:border-chip-400 hover:bg-chip-500/20"
        >
          New deck
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {decks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 bg-[#121820]/70 px-3 py-3 text-sm text-ink-500">
            No decks yet. Create your first deck to start adding cards.
          </p>
        ) : (
          decks.map((deck) => {
            const pending = pendingDeckCounts[String(deck._id)];
            const count = pending
              ? Object.values(pending).reduce((sum, value) => sum + value, 0)
              : deck.cards.reduce((sum, entry) => sum + entry.count, 0);
            const isActive = selectedDeck?._id === deck._id;

            return (
              <div
                key={deck._id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDeck(deck._id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectDeck(deck._id);
                  }
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "border-chip-400 bg-chip-500/20 text-chip-200"
                    : "border-white/10 bg-[#121820]/70 text-ink-300 hover:border-chip-500/40 hover:text-chip-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left font-medium">
                    {deck.name}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs opacity-80">
                    {count}/{DECK_MAX_CARDS}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
