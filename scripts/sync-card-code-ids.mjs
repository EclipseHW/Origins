import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const cardsPath = path.join(repoRoot, "lib", "cards.ts");
const deckPath = path.resolve(repoRoot, "..", "deck.md");
const EXTERNAL_DECK_CODE_PREFIX = "KGBLDC";
const EXTERNAL_DECK_CODE_VERSION = "v1";

function normalizeName(value) {
  return value
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeExternalCode(deckCode) {
  const [payload] = deckCode.trim().split(":");
  if (!payload || !payload.startsWith(EXTERNAL_DECK_CODE_PREFIX)) {
    throw new Error(`Invalid deck code: ${deckCode}`);
  }

  const decoded = Buffer.from(payload.slice(EXTERNAL_DECK_CODE_PREFIX.length), "base64").toString("utf8");
  const [version, ...entries] = decoded.split("|").filter(Boolean);

  if (version !== EXTERNAL_DECK_CODE_VERSION) {
    throw new Error(`Unsupported deck code version: ${deckCode}`);
  }

  return entries.join("|");
}

function parseCardEntries(cardsSource) {
  const matches = cardsSource.matchAll(
    /\[\s*"([^"]+)",\s*"([^"]+)",\s*"[^"]+",\s*"[^"]+",/g,
  );

  return [...matches].map((match) => ({
    name: match[1],
    slug: match[2],
  }));
}

function parseExistingExternalMap(cardsSource) {
  const blockMatch = cardsSource.match(
    /const externalCodeIdsBySlug: Partial<Record<string, string>> = \{([\s\S]*?)\n\};/,
  );
  if (!blockMatch) {
    throw new Error("Could not find externalCodeIdsBySlug block in lib/cards.ts");
  }

  const map = new Map();
  for (const line of blockMatch[1].split("\n")) {
    const entryMatch = line.match(/^\s*"?(.*?)"?\s*:\s*"([^"]+)",?$/);
    if (!entryMatch) {
      continue;
    }

    map.set(entryMatch[1], entryMatch[2]);
  }

  return {
    block: blockMatch[0],
    map,
  };
}

function parseDeckMappings(deckSource, nameToSlug) {
  const map = new Map();
  const unresolved = [];

  for (const rawLine of deckSource.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const parts = line.split(/\s*-\s*/, 2);
    if (parts.length !== 2) {
      unresolved.push({ line, reason: "Could not split code and card name" });
      continue;
    }

    const [deckCode, rawName] = parts;
    const normalizedName = normalizeName(rawName);
    const resolvedName = aliasByNormalizedName[normalizedName] ?? rawName;
    const slug = nameToSlug.get(normalizeName(resolvedName));

    if (!slug) {
      unresolved.push({ line, reason: `Unknown card name: ${rawName}` });
      continue;
    }

    map.set(slug, decodeExternalCode(deckCode));
  }

  return {
    map,
    unresolved,
  };
}

const cardsSource = fs.readFileSync(cardsPath, "utf8");
const deckSource = fs.readFileSync(deckPath, "utf8");

const cardEntries = parseCardEntries(cardsSource);
const nameToSlug = new Map(
  cardEntries.map(({ name, slug }) => [normalizeName(name), slug]),
);
const existing = parseExistingExternalMap(cardsSource);
const parsed = parseDeckMappings(deckSource, nameToSlug);

if (parsed.unresolved.length > 0) {
  const message = parsed.unresolved
    .map(({ line, reason }) => `- ${reason}: ${line}`)
    .join("\n");
  throw new Error(`Unresolved deck mappings:\n${message}`);
}

for (const [slug, externalCodeId] of parsed.map) {
  existing.map.set(slug, externalCodeId);
}

const orderedEntries = cardEntries
  .filter(({ slug }) => existing.map.has(slug))
  .map(({ slug }) => {
    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(slug) ? slug : `"${slug}"`;
    return `  ${key}: "${existing.map.get(slug)}",`;
  });

const nextBlock = [
  "const externalCodeIdsBySlug: Partial<Record<string, string>> = {",
  ...orderedEntries,
  "};",
].join("\n");

const nextCardsSource = cardsSource.replace(existing.block, nextBlock);
fs.writeFileSync(cardsPath, nextCardsSource);

console.log(
  `Synced ${parsed.map.size} deck code id mappings from ${path.basename(deckPath)}.`,
);
