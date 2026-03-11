export function getDeckFingerprint(
  legendarySlug: string | null,
  cardSlugs: string[],
): string | null {
  if (!legendarySlug || cardSlugs.length !== 12) {
    return null;
  }

  return `${legendarySlug}|${[...cardSlugs].sort().join(",")}`;
}
