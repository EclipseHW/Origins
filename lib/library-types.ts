export const RARITY_OPTIONS = ["Common", "Rare", "Epic", "Legendary"] as const;
export const ALIGNMENT_OPTIONS = ["Good", "Evil", "Neutral"] as const;
export const CARD_KIND_OPTIONS = ["Unit", "Spell", "Token", "Item"] as const;
export const KEYWORD_OPTIONS = [
  "On Reveal",
  "On Death",
  "Ongoing",
  "First Strike",
  "Double Strike",
  "Rebirth",
  "Shield",
  "Defender",
  "Trample",
  "Deathtouch",
  "Snipe",
  "Stun",
  "Discard",
  "Draw",
  "Move",
  "Summon",
  "Destroy",
  "Heal",
] as const;

export type LibraryRarity = (typeof RARITY_OPTIONS)[number] | "Token";
export type CardAlignment = (typeof ALIGNMENT_OPTIONS)[number];
export type FilterCardKind = (typeof CARD_KIND_OPTIONS)[number];
export type LibrarySection = "Main" | "Tokens" | "Items";

export type LibraryCard = {
  name: string;
  slug: string;
  artPath: string;
  rarity: LibraryRarity;
  cardType: "Unit" | "Spell" | "Item";
  filterKind: FilterCardKind;
  section: LibrarySection;
  mana: number;
  attack: number | null;
  health: number | null;
  alignment: CardAlignment;
  effect: string | null;
  legendaryPower: string | null;
  keywords: string[];
  generatedCardNames: string[];
};
