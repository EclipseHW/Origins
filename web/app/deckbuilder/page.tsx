import { currentUser } from "@clerk/nextjs/server";
import { DeckbuilderWorkspace } from "@/components/deckbuilder-workspace";
import { cards } from "@/lib/cards";

export default async function DeckbuilderPage() {
  const user = await currentUser();
  const playableCards = cards.filter((card) => card.section === "Main");

  return (
    <DeckbuilderWorkspace
      cards={playableCards}
      isSignedIn={Boolean(user)}
    />
  );
}
