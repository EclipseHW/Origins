// Generated from Cards.md. This is the runtime source of truth for card data.

export const CARD_RARITY_OPTIONS = ["Common", "Rare", "Epic", "Legendary", "Token"] as const;
export const CARD_TYPE_OPTIONS = ["Unit", "Spell", "Item"] as const;
export const CARD_FILTER_KIND_OPTIONS = ["Unit", "Spell", "Token", "Item"] as const;
export const CARD_ALIGNMENT_OPTIONS = ["Good", "Evil", "Neutral"] as const;
export const CARD_SECTION_OPTIONS = ["Main", "Tokens", "Items"] as const;
export const KEYWORD_OPTIONS = ["On Reveal","On Death","Ongoing","First Strike","Double Strike","Rebirth","Shield","Defender","Trample","Deathtouch","Snipe","Stun","Discard","Draw","Move","Summon","Destroy","Heal"] as const;

export type CardRarity = (typeof CARD_RARITY_OPTIONS)[number];
export type CardType = (typeof CARD_TYPE_OPTIONS)[number];
export type FilterCardKind = (typeof CARD_FILTER_KIND_OPTIONS)[number];
export type CardAlignment = (typeof CARD_ALIGNMENT_OPTIONS)[number];
export type CardSection = (typeof CARD_SECTION_OPTIONS)[number];

export type CardDefinition = {
  name: string;
  slug: string;
  artPath: string;
  rarity: CardRarity;
  cardType: CardType;
  filterKind: FilterCardKind;
  section: CardSection;
  mana: number;
  attack: number | null;
  health: number | null;
  alignment: CardAlignment;
  effect: string | null;
  legendaryPower: string | null;
  keywords: string[];
  generatedCardNames: string[];
};

type RawCardTuple = readonly [
  name: string,
  slug: string,
  rarity: CardRarity,
  cardType: CardType,
  mana: number,
  attack: number | null,
  health: number | null,
  alignment: CardAlignment,
  effect: string | null,
  legendaryPower: string | null,
];

const keywordMatchers: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "On Reveal", pattern: /\bOn Reveal\b/i },
  { label: "On Death", pattern: /\bOn Death\b/i },
  { label: "Ongoing", pattern: /\bOngoing\b/i },
  { label: "First Strike", pattern: /\bFirst Strike\b/i },
  { label: "Double Strike", pattern: /\bDouble Strike\b/i },
  { label: "Rebirth", pattern: /\bRebirth\b/i },
  { label: "Shield", pattern: /\bShield\b/i },
  { label: "Defender", pattern: /\bDefender\b/i },
  { label: "Trample", pattern: /\bTrample\b/i },
  { label: "Deathtouch", pattern: /\bDeathtouch\b/i },
  { label: "Snipe", pattern: /\bSnipe\b/i },
  { label: "Stun", pattern: /\bstun(?:ned|s|ning)?\b/i },
  { label: "Discard", pattern: /\bdiscard(?:ed|s|ing)?\b/i },
  { label: "Draw", pattern: /\bdraw(?:s|ing)?\b/i },
  { label: "Move", pattern: /\bmov(?:e|es|ed|ing)\b/i },
  { label: "Summon", pattern: /\bsummon(?:s|ed|ing)?\b/i },
  { label: "Destroy", pattern: /\bdestroy(?:s|ed|ing)?\b/i },
  { label: "Heal", pattern: /\bheal(?:s|ed|ing)?\b/i },
];

export function slugifyCardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractKeywords(effect: string | null, legendaryPower: string | null): string[] {
  const source = [effect, legendaryPower].filter(Boolean).join(" ");

  return KEYWORD_OPTIONS.filter((keyword) =>
    keywordMatchers.find((entry) => entry.label === keyword)?.pattern.test(source),
  );
}

function getFilterKind(rarity: CardRarity, cardType: CardType): FilterCardKind {
  if (cardType === "Item") {
    return "Item";
  }

  if (rarity === "Token") {
    return "Token";
  }

  return cardType;
}

function getSection(rarity: CardRarity, cardType: CardType): CardSection {
  if (cardType === "Item") {
    return "Items";
  }

  return rarity === "Token" ? "Tokens" : "Main";
}

const rawCardEntries = [
  [
    "Thumbelina",
    "thumbelina",
    "Common",
    "Unit",
    0,
    1,
    1,
    "Good",
    null,
    null
  ],
  [
    "Bagheera",
    "bagheera",
    "Common",
    "Unit",
    1,
    1,
    2,
    "Good",
    "On Reveal: If I'm at a middle space, I get +1 Attack and +1 Health.",
    null
  ],
  [
    "Huck Finn",
    "huck-finn",
    "Common",
    "Unit",
    1,
    2,
    1,
    "Good",
    null,
    null
  ],
  [
    "Mummy",
    "mummy",
    "Common",
    "Unit",
    1,
    1,
    1,
    "Evil",
    "Rebirth",
    null
  ],
  [
    "Piglet",
    "piglet",
    "Common",
    "Unit",
    1,
    1,
    1,
    "Good",
    "On Reveal: Another friendly character gets +1 Attack and +1 Health.",
    null
  ],
  [
    "Ugly Duckling",
    "ugly-duckling",
    "Common",
    "Unit",
    1,
    1,
    1,
    "Neutral",
    "When I'm discarded, add Beautiful Swan to your hand.",
    null
  ],
  [
    "Billy",
    "billy",
    "Common",
    "Unit",
    2,
    2,
    2,
    "Evil",
    "On Death: Deal 2 damage to a random enemy character here.",
    null
  ],
  [
    "Don Quixote",
    "don-quixote",
    "Common",
    "Unit",
    2,
    2,
    3,
    "Good",
    "When I attack, deal 1 damage to both barriers here.",
    null
  ],
  [
    "Huntsman",
    "huntsman",
    "Common",
    "Unit",
    2,
    2,
    1,
    "Good",
    "First Strike",
    null
  ],
  [
    "Jack-in-the-Box",
    "jack-in-the-box",
    "Common",
    "Unit",
    2,
    2,
    1,
    "Evil",
    "On Death: Deal 2 damage to the enemy barrier here.",
    null
  ],
  [
    "Morgan le Fay",
    "morgan-le-fay",
    "Common",
    "Unit",
    2,
    1,
    3,
    "Evil",
    "On Reveal: Discard a random card. Draw a card and reduce its cost by 1.",
    null
  ],
  [
    "Prince Charming",
    "prince-charming",
    "Common",
    "Unit",
    2,
    2,
    1,
    "Good",
    "On Reveal: Remove abilities from another character here.",
    null
  ],
  [
    "Quasimodo",
    "quasimodo",
    "Common",
    "Unit",
    2,
    3,
    3,
    "Good",
    "On Reveal: If an enemy character was played here this round, discard the lowest-cost card in your hand.",
    null
  ],
  [
    "Roo",
    "roo",
    "Common",
    "Unit",
    2,
    2,
    3,
    "Good",
    "I can move anywhere once.",
    null
  ],
  [
    "Rumple",
    "rumple",
    "Common",
    "Unit",
    2,
    1,
    1,
    "Evil",
    "On Reveal: You get +1 mana next round.",
    null
  ],
  [
    "Scarecrow",
    "scarecrow",
    "Common",
    "Unit",
    2,
    1,
    2,
    "Good",
    "On Reveal: Draw a card.",
    null
  ],
  [
    "Stormalong",
    "stormalong",
    "Common",
    "Unit",
    2,
    3,
    2,
    "Neutral",
    null,
    null
  ],
  [
    "Three Blind Mice",
    "three-blind-mice",
    "Common",
    "Unit",
    2,
    1,
    1,
    "Neutral",
    "On Death: Summon a Mouse [1/1] at two random spaces.",
    null
  ],
  [
    "Tin Woodman",
    "tin-woodman",
    "Common",
    "Unit",
    2,
    2,
    1,
    "Good",
    "On Reveal: Heal anything here for 2.",
    null
  ],
  [
    "Aladdin",
    "aladdin",
    "Common",
    "Unit",
    3,
    3,
    3,
    "Good",
    "When I'm discarded, summon me at a random space.",
    null
  ],
  [
    "Asanbosam",
    "asanbosam",
    "Common",
    "Unit",
    3,
    5,
    5,
    "Evil",
    "On Reveal: Discard a random character in your hand.",
    null
  ],
  [
    "Big Bad Wolf",
    "big-bad-wolf",
    "Common",
    "Unit",
    3,
    3,
    3,
    "Evil",
    "After combat, I get +1 Attack and +1 Health.",
    null
  ],
  [
    "El Charro Negro",
    "el-charro-negro",
    "Common",
    "Unit",
    3,
    2,
    4,
    "Evil",
    "Snipe 1",
    null
  ],
  [
    "Flying Monkey",
    "flying-monkey",
    "Common",
    "Unit",
    3,
    2,
    3,
    "Evil",
    "On Reveal: Move another friendly character at this location.",
    null
  ],
  [
    "Golden Egg",
    "golden-egg",
    "Common",
    "Unit",
    3,
    0,
    1,
    "Neutral",
    "On Death: Summon a Golden Goose [5/5] at this space.",
    null
  ],
  [
    "Kanga",
    "kanga",
    "Common",
    "Unit",
    3,
    2,
    4,
    "Good",
    "When a friendly character moves, give it +1 Attack.",
    null
  ],
  [
    "Sheriff of Nottingham",
    "sheriff-of-nottingham",
    "Common",
    "Unit",
    3,
    2,
    3,
    "Evil",
    "On Reveal: Stun an enemy character here.",
    null
  ],
  [
    "Shield Maiden",
    "shield-maiden",
    "Common",
    "Unit",
    3,
    3,
    1,
    "Good",
    "Shield",
    null
  ],
  [
    "Sleeping Beauty",
    "sleeping-beauty",
    "Common",
    "Unit",
    3,
    5,
    5,
    "Good",
    "I deal 0 damage to barriers.",
    null
  ],
  [
    "Tuck",
    "tuck",
    "Common",
    "Unit",
    3,
    3,
    3,
    "Good",
    "On Reveal: If an enemy character was played here this round, draw a card.",
    null
  ],
  [
    "Wendy",
    "wendy",
    "Common",
    "Unit",
    3,
    4,
    3,
    "Neutral",
    null,
    null
  ],
  [
    "Boogeyman",
    "boogeyman",
    "Common",
    "Unit",
    4,
    7,
    7,
    "Evil",
    "On Reveal: Destroy a friendly character.",
    null
  ],
  [
    "Captain Ahab",
    "captain-ahab",
    "Common",
    "Unit",
    4,
    3,
    1,
    "Neutral",
    "On Reveal: Discard a random card. Deal 5 damage to the enemy character with the highest Attack.",
    null
  ],
  [
    "Christopher Robin",
    "christopher-robin",
    "Common",
    "Unit",
    4,
    5,
    4,
    "Good",
    null,
    null
  ],
  [
    "Little John",
    "little-john",
    "Common",
    "Unit",
    4,
    4,
    4,
    "Good",
    "On Reveal: If an enemy character was played here this round, I get +2 Attack and +2 Health.",
    null
  ],
  [
    "Baloo",
    "baloo",
    "Common",
    "Unit",
    5,
    6,
    6,
    "Good",
    null,
    null
  ],
  [
    "Bigfoot",
    "bigfoot",
    "Common",
    "Unit",
    5,
    6,
    4,
    "Neutral",
    "Trample",
    null
  ],
  [
    "Bridge Troll",
    "bridge-troll",
    "Common",
    "Unit",
    5,
    4,
    6,
    "Evil",
    "Defender",
    null
  ],
  [
    "Paul Bunyan",
    "paul-bunyan",
    "Common",
    "Unit",
    7,
    10,
    10,
    "Neutral",
    null,
    null
  ],
  [
    "Bullseye",
    "bullseye",
    "Common",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Deal 3 damage to a character.",
    null
  ],
  [
    "Defense Matrix",
    "defense-matrix",
    "Common",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Give a character Shield.",
    null
  ],
  [
    "First Aid",
    "first-aid",
    "Common",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Heal anything for 4.",
    null
  ],
  [
    "Poison Apple",
    "poison-apple",
    "Common",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Give a character Deathtouch.",
    null
  ],
  [
    "Reinforcements",
    "reinforcements",
    "Common",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Summon a Merry Man [1/1] at two random spaces.",
    null
  ],
  [
    "Searing Light",
    "searing-light",
    "Common",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Deal 1 damage to ALL characters.",
    null
  ],
  [
    "Mind Palace",
    "mind-palace",
    "Common",
    "Spell",
    2,
    null,
    null,
    "Neutral",
    "Draw 2 cards.",
    null
  ],
  [
    "Stroke of Midnight",
    "stroke-of-midnight",
    "Common",
    "Spell",
    2,
    null,
    null,
    "Neutral",
    "Return ANY character to its owner's hand.",
    null
  ],
  [
    "Dark Omen",
    "dark-omen",
    "Common",
    "Spell",
    3,
    null,
    null,
    "Neutral",
    "Destroy a character.",
    null
  ],
  [
    "Lightning Strike",
    "lightning-strike",
    "Common",
    "Spell",
    3,
    null,
    null,
    "Neutral",
    "Deal 3 damage to anything.",
    null
  ],
  [
    "The Firebird",
    "the-firebird",
    "Rare",
    "Unit",
    1,
    1,
    1,
    "Neutral",
    "Ongoing: I deal 3 damage to barriers.",
    null
  ],
  [
    "Toto",
    "toto",
    "Rare",
    "Unit",
    1,
    1,
    1,
    "Good",
    "After an enemy character is played here, I move to another location and get +1 Attack.",
    null
  ],
  [
    "Banshee",
    "banshee",
    "Rare",
    "Unit",
    2,
    1,
    1,
    "Evil",
    "On Death: Friendly characters get +1 Attack and +1 Health.",
    null
  ],
  [
    "Lady of the Lake",
    "lady-of-the-lake",
    "Rare",
    "Unit",
    2,
    2,
    2,
    "Good",
    "On Reveal: Give a friendly character here Defender.",
    null
  ],
  [
    "Mad Hatter",
    "mad-hatter",
    "Rare",
    "Unit",
    2,
    2,
    3,
    "Neutral",
    "On Reveal: I get +1 Attack for each other friendly character here.",
    null
  ],
  [
    "Mothman",
    "mothman",
    "Rare",
    "Unit",
    2,
    3,
    2,
    "Evil",
    "On Reveal: Destroy this location.",
    null
  ],
  [
    "Shahrazad",
    "shahrazad",
    "Rare",
    "Unit",
    2,
    1,
    4,
    "Good",
    "When a card enters your hand, heal your barrier here for 1.",
    null
  ],
  [
    "Black Knight",
    "black-knight",
    "Rare",
    "Unit",
    3,
    2,
    2,
    "Neutral",
    "On Reveal: Deal 3 damage to the enemy character across from me.",
    null
  ],
  [
    "Butcher",
    "butcher",
    "Rare",
    "Unit",
    3,
    3,
    3,
    "Evil",
    "On Reveal: Randomly destroy ANY character.",
    null
  ],
  [
    "Cheshire",
    "cheshire",
    "Rare",
    "Unit",
    3,
    4,
    2,
    "Neutral",
    "On Reveal: I swap spaces with another friendly character.",
    null
  ],
  [
    "Cowardly Lion",
    "cowardly-lion",
    "Rare",
    "Unit",
    3,
    2,
    5,
    "Good",
    "Defender",
    null
  ],
  [
    "Humpty",
    "humpty",
    "Rare",
    "Unit",
    3,
    3,
    1,
    "Evil",
    "On Death: Draw a card.",
    null
  ],
  [
    "King Shahryar",
    "king-shahryar",
    "Rare",
    "Unit",
    3,
    1,
    4,
    "Evil",
    "When the round starts, draw a card. Discard it before combat.",
    null
  ],
  [
    "Queen of the Night",
    "queen-of-the-night",
    "Rare",
    "Unit",
    3,
    2,
    3,
    "Evil",
    "When you play a spell, deal 2 damage to the enemy barrier here.",
    null
  ],
  [
    "Baba Yaga",
    "baba-yaga",
    "Rare",
    "Unit",
    4,
    3,
    3,
    "Evil",
    "On Reveal: Deal 2 damage to another character. It gets +2 Attack.",
    null
  ],
  [
    "Beowulf",
    "beowulf",
    "Rare",
    "Unit",
    4,
    2,
    5,
    "Good",
    "When ANY friendly character is dealt damage, I get +1 Attack.",
    null
  ],
  [
    "Glinda",
    "glinda",
    "Rare",
    "Unit",
    4,
    2,
    5,
    "Good",
    "When you play another Good character here, it gets +2 Attack and +2 Health.",
    null
  ],
  [
    "Imhotep",
    "imhotep",
    "Rare",
    "Unit",
    4,
    2,
    3,
    "Evil",
    "On Death: Deal 2 damage to all enemy characters here.",
    null
  ],
  [
    "Marian",
    "marian",
    "Rare",
    "Unit",
    4,
    3,
    4,
    "Good",
    "Snipe 2",
    null
  ],
  [
    "Moby",
    "moby",
    "Rare",
    "Unit",
    4,
    4,
    4,
    "Neutral",
    "On Reveal: Destroy all other friendly characters here. I get their Attack and Health.",
    null
  ],
  [
    "White Queen",
    "white-queen",
    "Rare",
    "Unit",
    4,
    2,
    3,
    "Neutral",
    "On Reveal: Put a character into its owner's hand.",
    null
  ],
  [
    "Fairy Godmother",
    "fairy-godmother",
    "Rare",
    "Unit",
    5,
    3,
    3,
    "Good",
    "On Reveal: Another random friendly character here gets +3 Attack and +3 Health.",
    null
  ],
  [
    "Galahad",
    "galahad",
    "Rare",
    "Unit",
    5,
    4,
    3,
    "Good",
    "Ongoing: Other friendly characters have +1 Attack and +1 Health.",
    null
  ],
  [
    "Grendel",
    "grendel",
    "Rare",
    "Unit",
    5,
    5,
    5,
    "Evil",
    "When I attack, deal 1 damage to everything else here.",
    null
  ],
  [
    "Mowgli",
    "mowgli",
    "Rare",
    "Unit",
    5,
    1,
    1,
    "Good",
    "On Reveal: Summon Baloo [6/6] at another random location.",
    null
  ],
  [
    "Guy of Gisborne",
    "guy-of-gisborne",
    "Rare",
    "Unit",
    6,
    4,
    5,
    "Evil",
    "On Reveal: Deal 2 damage to anything here. If an enemy character was played here this round, deal 4 instead.",
    null
  ],
  [
    "Babe",
    "babe",
    "Rare",
    "Unit",
    7,
    6,
    6,
    "Neutral",
    "Friendly characters have Trample.",
    null
  ],
  [
    "Jack's Giant",
    "jacks-giant",
    "Rare",
    "Unit",
    7,
    8,
    8,
    "Evil",
    "Defender",
    null
  ],
  [
    "Freeze!",
    "freeze",
    "Rare",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Stun a character.",
    null
  ],
  [
    "Run Over",
    "run-over",
    "Rare",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Give a character Trample.",
    null
  ],
  [
    "Trash for Treasure",
    "trash-for-treasure",
    "Rare",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Destroy a friendly character. Draw 2 cards.",
    null
  ],
  [
    "Twister Toss",
    "twister-toss",
    "Rare",
    "Spell",
    1,
    null,
    null,
    "Neutral",
    "Move a friendly character anywhere.",
    null
  ],
  [
    "Axe Throw",
    "axe-throw",
    "Rare",
    "Spell",
    2,
    null,
    null,
    "Neutral",
    "Deal 5 damage to a character.",
    null
  ],
  [
    "Soul Surge",
    "soul-surge",
    "Rare",
    "Spell",
    2,
    null,
    null,
    "Neutral",
    "Destroy a character, then resummon it at a random space.",
    null
  ],
  [
    "En Passant",
    "en-passant",
    "Rare",
    "Spell",
    3,
    null,
    null,
    "Neutral",
    "Move a friendly character, then deal 2 damage to the character across from it.",
    null
  ],
  [
    "It's Alive",
    "its-alive",
    "Rare",
    "Spell",
    3,
    null,
    null,
    "Neutral",
    "Move a friendly character and give it +2 Attack.",
    null
  ],
  [
    "Piggy Bank",
    "piggy-bank",
    "Rare",
    "Spell",
    3,
    null,
    null,
    "Neutral",
    "You get +1 mana for the rest of the game.",
    null
  ],
  [
    "Rain of Arrows",
    "rain-of-arrows",
    "Rare",
    "Spell",
    5,
    null,
    null,
    "Neutral",
    "Deal 2 damage to all enemy characters.",
    null
  ],
  [
    "White Rabbit",
    "white-rabbit",
    "Epic",
    "Unit",
    1,
    1,
    2,
    "Neutral",
    "On Reveal: Move the next character you play one space toward me.",
    null
  ],
  [
    "Baby Bear",
    "baby-bear",
    "Epic",
    "Unit",
    2,
    1,
    1,
    "Neutral",
    "When an enemy character damages your barrier here, deal 1 damage to it. On Death: Add Papa Bear to your hand.",
    null
  ],
  [
    "Card Soldier",
    "card-soldier",
    "Epic",
    "Unit",
    2,
    2,
    1,
    "Neutral",
    "After I move, summon a copy of me at my previous space.",
    null
  ],
  [
    "Hansel and Gretel",
    "hansel-and-gretel",
    "Epic",
    "Unit",
    2,
    1,
    1,
    "Neutral",
    "Double Strike",
    null
  ],
  [
    "Alice",
    "alice",
    "Epic",
    "Unit",
    3,
    2,
    4,
    "Good",
    "On Reveal: Replace this location with Wonderland.",
    null
  ],
  [
    "Beast",
    "beast",
    "Epic",
    "Unit",
    3,
    2,
    3,
    "Evil",
    "When you play a character, I get +1 Attack and +1 Health.",
    null
  ],
  [
    "Mary",
    "mary",
    "Epic",
    "Unit",
    3,
    1,
    1,
    "Neutral",
    "On Reveal: Add Little Lamb to your hand. On Death: Your Little Lambs everywhere get +3 Attack and +3 Health.",
    null
  ],
  [
    "Beauty",
    "beauty",
    "Epic",
    "Unit",
    4,
    2,
    2,
    "Good",
    "When you play a character, draw a card.",
    null
  ],
  [
    "Jekyll",
    "jekyll",
    "Epic",
    "Unit",
    4,
    3,
    5,
    "Good",
    "On Reveal: Heal anything here for 3. If I'm in your hand after combat, I transform into Hyde.",
    null
  ],
  [
    "Lancelot",
    "lancelot",
    "Epic",
    "Unit",
    4,
    2,
    2,
    "Good",
    "First Strike. On Reveal: Friendly characters here have +1 Attack this round.",
    null
  ],
  [
    "Queen Guinevere",
    "queen-guinevere",
    "Epic",
    "Unit",
    4,
    2,
    3,
    "Good",
    "On Reveal: Another friendly character or barrier here gets Shield. When a Shielded character or barrier loses Shield, draw a card.",
    null
  ],
  [
    "Wicked Witch of the West",
    "wicked-witch-of-the-west",
    "Epic",
    "Unit",
    4,
    2,
    5,
    "Evil",
    "When I'm damaged, add a Flying Monkey to your hand and I move one space to the left.",
    null
  ],
  [
    "Genie",
    "genie",
    "Epic",
    "Unit",
    5,
    3,
    3,
    "Neutral",
    "On Reveal: Discard your hand. Draw 3 cards.",
    null
  ],
  [
    "Hare",
    "hare",
    "Epic",
    "Unit",
    5,
    4,
    1,
    "Neutral",
    "First Strike. I can move anywhere once.",
    null
  ],
  [
    "Pegasus",
    "pegasus",
    "Epic",
    "Unit",
    5,
    2,
    5,
    "Good",
    "After I move, my Attack doubles.",
    null
  ],
  [
    "The Green Knight",
    "the-green-knight",
    "Epic",
    "Unit",
    5,
    5,
    5,
    "Neutral",
    "After combat, I fully heal.",
    null
  ],
  [
    "Three Musketeers",
    "three-musketeers",
    "Epic",
    "Unit",
    5,
    2,
    1,
    "Good",
    "On Reveal: Summon a Musketeer [2/1] with First Strike at each space here.",
    null
  ],
  [
    "Cockatrice",
    "cockatrice",
    "Epic",
    "Unit",
    6,
    6,
    6,
    "Evil",
    "Deathtouch. On Death: Destroy a random enemy character.",
    null
  ],
  [
    "Frank's Monster",
    "franks-monster",
    "Epic",
    "Unit",
    6,
    5,
    4,
    "Evil",
    "Rebirth. When I leave the graveyard, double my Attack.",
    null
  ],
  [
    "Koschei",
    "koschei",
    "Epic",
    "Unit",
    6,
    3,
    3,
    "Evil",
    "On Death or when I'm discarded: I return to your hand and get +2 Attack and +2 Health permanently.",
    null
  ],
  [
    "Sandman",
    "sandman",
    "Epic",
    "Unit",
    6,
    5,
    5,
    "Neutral",
    "Before combat, reduce the cost of cards in your hand by 1.",
    null
  ],
  [
    "Tortoise",
    "tortoise",
    "Epic",
    "Unit",
    6,
    0,
    5,
    "Neutral",
    "Shield. Ongoing: Friendly characters have Attack equal to their Health.",
    null
  ],
  [
    "Moriarty",
    "moriarty",
    "Epic",
    "Unit",
    7,
    3,
    3,
    "Evil",
    "On Reveal: Swap spaces of two friendly characters. I have +1 Attack and +1 Health for each time a friendly character moved this game.",
    null
  ],
  [
    "Bandersnatch",
    "bandersnatch",
    "Epic",
    "Unit",
    8,
    9,
    9,
    "Evil",
    "Trample",
    null
  ],
  [
    "Phantom Coachman",
    "phantom-coachman",
    "Epic",
    "Unit",
    10,
    8,
    8,
    "Evil",
    "Deathtouch. I cost 2 less for each friendly character you've destroyed this game.",
    null
  ],
  [
    "Heroic Charge",
    "heroic-charge",
    "Epic",
    "Spell",
    6,
    null,
    null,
    "Neutral",
    "Friendly characters have +2 Attack and Trample this round.",
    null
  ],
  [
    "Obliterate",
    "obliterate",
    "Epic",
    "Spell",
    10,
    null,
    null,
    "Neutral",
    "Deal 10 damage to anything.",
    null
  ],
  [
    "Dracula",
    "dracula",
    "Legendary",
    "Unit",
    4,
    3,
    3,
    "Evil",
    "When I attack, discard a random card from your hand. When you discard a card, I get +2 Attack and +2 Health.",
    "At the start of the game, add an Ugly Duckling to your hand."
  ],
  [
    "Wicked Stepmother",
    "wicked-stepmother",
    "Legendary",
    "Unit",
    4,
    2,
    4,
    "Evil",
    "Deathtouch. On Reveal: All your Evil characters get Deathtouch.",
    "At the start of the game, add a Poison Apple to your hand. It costs 1 less."
  ],
  [
    "Death",
    "death",
    "Legendary",
    "Unit",
    5,
    1,
    1,
    "Evil",
    "On Reveal: Destroy another friendly character to destroy an enemy character. When a friendly character dies, I get +1 Attack and +1 Health.",
    "At the start of the game, summon a Golden Egg at a random friendly space. Your barriers start with 3 less health."
  ],
  [
    "Dorothy",
    "dorothy",
    "Legendary",
    "Unit",
    5,
    4,
    4,
    "Good",
    "I can move anywhere each round. When a friendly character moves, it gets +1 Attack and +1 Health.",
    "At the start of the game, add a Twister Toss to your hand. It costs 1 less."
  ],
  [
    "Queen of Hearts",
    "queen-of-hearts",
    "Legendary",
    "Unit",
    5,
    3,
    5,
    "Evil",
    "Ongoing: Double friendly On Death abilities.",
    "At the start of the game, add a Trash for Treasure to your hand. It costs 1 less."
  ],
  [
    "Red",
    "red",
    "Legendary",
    "Unit",
    5,
    5,
    4,
    "Good",
    "On Reveal: Deal 5 damage to an enemy character. On Kill: Add a copy of the character to your hand.",
    "At the start of the game, summon a Big Bad Wolf at a random friendly space. You start with 2 less cards."
  ],
  [
    "Winnie-the-Pooh",
    "winnie-the-pooh",
    "Legendary",
    "Unit",
    5,
    5,
    5,
    "Good",
    "On Reveal: Add a Honey Pot to your hand. Double all buffs and debuffs to my Attack and Health.",
    "At the start of the game, summon a Honey Pot at a random friendly space."
  ],
  [
    "King Arthur",
    "king-arthur",
    "Legendary",
    "Unit",
    7,
    5,
    5,
    "Good",
    "Shield. On Reveal: All your Good characters get Shield.",
    "At the start of the game, add a Defense Matrix to your hand. It costs 1 less."
  ],
  [
    "Three Not So Little Pigs",
    "three-not-so-little-pigs",
    "Legendary",
    "Unit",
    7,
    4,
    4,
    "Neutral",
    "Trample. On Reveal: Summon a Not So Little Pig [4/4] with Trample at a random space at each other location.",
    "At the start of the game, summon a Not So Little Pig [4/4] with Trample at a random friendly space. You start with 1 less card."
  ],
  [
    "Robin Hood",
    "robin-hood",
    "Legendary",
    "Unit",
    8,
    4,
    4,
    "Good",
    "Snipe 3. On Reveal: Deal 2 damage to all enemy characters.",
    "At the start of the game, add a Bullseye to your hand. It costs 1 less."
  ],
  [
    "Legion of the Dead",
    "legion-of-the-dead",
    "Legendary",
    "Spell",
    7,
    null,
    null,
    "Neutral",
    "Fill your board with Zombies.",
    "At the start of the game, summon a Zombie at a random friendly space."
  ],
  [
    "Beautiful Swan",
    "beautiful-swan",
    "Token",
    "Unit",
    1,
    3,
    3,
    "Neutral",
    "When I'm discarded, summon me at a random friendly space.",
    null
  ],
  [
    "Mouse",
    "mouse",
    "Token",
    "Unit",
    1,
    1,
    1,
    "Neutral",
    null,
    null
  ],
  [
    "Golden Goose",
    "golden-goose",
    "Token",
    "Unit",
    3,
    5,
    5,
    "Neutral",
    null,
    null
  ],
  [
    "Merry Man",
    "merry-man",
    "Token",
    "Unit",
    1,
    1,
    1,
    "Good",
    null,
    null
  ],
  [
    "Papa Bear",
    "papa-bear",
    "Token",
    "Unit",
    4,
    4,
    4,
    "Neutral",
    "When an enemy character damages your barrier here, deal 3 damage to it. On Death: Add Mama Bear [6/6] to your hand.",
    null
  ],
  [
    "Mama Bear",
    "mama-bear",
    "Token",
    "Unit",
    6,
    6,
    6,
    "Neutral",
    "When an enemy character damages your barrier here, destroy it.",
    null
  ],
  [
    "Little Lamb",
    "little-lamb",
    "Token",
    "Unit",
    2,
    1,
    1,
    "Neutral",
    "Trample",
    null
  ],
  [
    "Musketeer",
    "musketeer",
    "Token",
    "Unit",
    2,
    2,
    1,
    "Good",
    "First Strike",
    null
  ],
  [
    "Not So Little Pig",
    "not-so-little-pig",
    "Token",
    "Unit",
    4,
    4,
    4,
    "Neutral",
    "Trample",
    null
  ],
  [
    "Zombie",
    "zombie",
    "Token",
    "Unit",
    2,
    2,
    2,
    "Evil",
    null,
    null
  ],
  [
    "Honey Pot",
    "honey-pot",
    "Token",
    "Item",
    1,
    null,
    null,
    "Neutral",
    "Item (Play to a space. Consume when a character shares that space) Give a character +2 Attack and +2 Health.",
    null
  ]
] as const satisfies readonly RawCardTuple[];

const referenceableCardNames = rawCardEntries.map(([name]) => name);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractGeneratedCardNames(
  name: string,
  effect: string | null,
  legendaryPower: string | null,
): string[] {
  const source = [effect, legendaryPower].filter(Boolean).join(" ");

  if (!source || !/\b(summon|add|create)\b/i.test(source)) {
    return [];
  }

  return referenceableCardNames.filter((candidate) => {
    if (candidate === name) {
      return false;
    }

    return new RegExp(
      `\\b(?:summon|add|create)\\b[^.!?;:]*\\b${escapeRegExp(candidate)}\\b`,
      "i",
    ).test(source);
  });
}

export const cards: CardDefinition[] = rawCardEntries.map((entry) => {
  const [name, slug, rarity, cardType, mana, attack, health, alignment, effect, legendaryPower] = entry;

  return {
    name,
    slug,
    artPath: `assets/${slug}.png`,
    rarity,
    cardType,
    filterKind: getFilterKind(rarity, cardType),
    section: getSection(rarity, cardType),
    mana,
    attack,
    health,
    alignment,
    effect,
    legendaryPower,
    keywords: extractKeywords(effect, legendaryPower),
    generatedCardNames: extractGeneratedCardNames(name, effect, legendaryPower),
  };
});

export const cardsByName: Record<string, CardDefinition> = Object.fromEntries(
  cards.map((card) => [card.name, card]),
);

export const cardsBySlug: Record<string, CardDefinition> = Object.fromEntries(
  cards.map((card) => [card.slug, card]),
);

export const cardsByArtPath: Record<string, CardDefinition> = Object.fromEntries(
  cards.map((card) => [card.artPath, card]),
);
