import { LibraryBrowser } from "@/components/library-browser";
import { getLibraryCards } from "@/lib/library-data";

export default function LibraryCardsPage() {
  const cards = getLibraryCards();

  return <LibraryBrowser cards={cards} />;
}
