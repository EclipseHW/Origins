import { Suspense } from "react";
import { DeckbuilderWorkspace } from "@/components/deckbuilder-workspace";
import { cards } from "@/lib/cards";

export default function DeckbuilderPage() {
  const playableCards = cards.filter((card) => card.section === "Main");

  return (
    <div className="min-h-full overflow-visible xl:h-full xl:min-h-0 xl:overflow-hidden">
      <Suspense
        fallback={
          <div className="min-h-full overflow-visible bg-transparent xl:h-full xl:min-h-0 xl:overflow-hidden" />
        }
      >
        <DeckbuilderWorkspace cards={playableCards} />
      </Suspense>
    </div>
  );
}
