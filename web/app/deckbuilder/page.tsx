import { DeckbuilderWorkspace } from "@/components/deckbuilder-workspace";
import { cards } from "@/lib/cards";

export default function DeckbuilderPage() {
  const playableCards = cards.filter((card) => card.section === "Main");

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <DeckbuilderWorkspace cards={playableCards} />
    </div>
  );
}
