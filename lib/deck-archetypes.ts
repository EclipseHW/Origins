export const DECK_ARCHETYPE_OPTIONS = [
  "Aggro",
  "Midrange",
  "Combo",
  "Control",
] as const;

export type DeckArchetype = (typeof DECK_ARCHETYPE_OPTIONS)[number];
