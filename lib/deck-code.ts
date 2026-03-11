import type { CardDefinition } from "@/lib/cards";
import { DECK_ARCHETYPE_OPTIONS, type DeckArchetype } from "@/lib/deck-archetypes";
import type { DeckDraft } from "@/lib/deck-types";

const LOCAL_DECK_CODE_PREFIX = "OB1:";
const EXTERNAL_DECK_CODE_PREFIX = "KGBLDC";
const EXTERNAL_DECK_CODE_VERSION = "v1";

export type PortableDeckState = Pick<
  DeckDraft,
  "deckName" | "legendarySlug" | "cardSlugs" | "archetype"
>;

function isDeckArchetype(value: string): value is DeckArchetype {
  return DECK_ARCHETYPE_OPTIONS.includes(value as DeckArchetype);
}

export function encodeLocalDeckCode(deck: PortableDeckState): string {
  const payload = JSON.stringify(deck);
  return `${LOCAL_DECK_CODE_PREFIX}${btoa(payload)}`;
}

export function decodeLocalDeckCode(code: string): PortableDeckState | null {
  if (!code.startsWith(LOCAL_DECK_CODE_PREFIX)) {
    return null;
  }

  try {
    const decoded = atob(code.slice(LOCAL_DECK_CODE_PREFIX.length));
    const parsed = JSON.parse(decoded) as Partial<PortableDeckState>;

    return {
      deckName: typeof parsed.deckName === "string" ? parsed.deckName : "",
      legendarySlug:
        typeof parsed.legendarySlug === "string" ? parsed.legendarySlug : null,
      cardSlugs: Array.isArray(parsed.cardSlugs)
        ? parsed.cardSlugs.filter((slug): slug is string => typeof slug === "string")
        : [],
      archetype:
        typeof parsed.archetype === "string" && isDeckArchetype(parsed.archetype)
          ? parsed.archetype
          : null,
    };
  } catch {
    return null;
  }
}

async function computeExternalDeckCodeChecksum(payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 8);
}

export async function encodeExternalDeckCode(
  deck: Pick<DeckDraft, "legendarySlug" | "cardSlugs">,
  cardBySlug: Record<string, CardDefinition>,
): Promise<string | null> {
  const slugs = [deck.legendarySlug, ...deck.cardSlugs].filter(
    (slug): slug is string => typeof slug === "string" && slug.length > 0,
  );
  const externalIds: string[] = [];

  for (const slug of slugs) {
    const card = cardBySlug[slug];
    if (!card?.externalCodeId) {
      return null;
    }
    externalIds.push(card.externalCodeId);
  }

  const payloadText = [...externalIds]
    .sort((left, right) => left.localeCompare(right))
    .join("|");
  const decodedPayload = `${EXTERNAL_DECK_CODE_VERSION}|${payloadText}`;
  const checksum = await computeExternalDeckCodeChecksum(decodedPayload);
  const payload = `${EXTERNAL_DECK_CODE_PREFIX}${btoa(decodedPayload)}`;

  return `${payload}:${checksum}`;
}

export function decodeExternalDeckCode(
  code: string,
  cardByExternalId: Record<string, CardDefinition>,
): PortableDeckState | null {
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
      deckName: "",
      legendarySlug,
      cardSlugs,
      archetype: null,
    };
  } catch {
    return null;
  }
}
