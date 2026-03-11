import { cards } from "@/lib/cards";
import type { LibraryCard } from "./library-types";

export function getLibraryCards(): LibraryCard[] {
  return cards;
}
