import { DeckbuilderWorkspace } from "@/components/deckbuilder-workspace";
import { cards } from "@/lib/cards";

export default function DeckbuilderPage() {
  const playableCards = cards.filter((card) => card.section === "Main");

  return <DeckbuilderWorkspace cards={playableCards} />;
}
