export type DeckDraft = {
  deckName: string;
  legendarySlug: string | null;
  cardSlugs: string[];
};

export type DeckRecord = DeckDraft & {
  _id: string;
  userId?: string;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
};
