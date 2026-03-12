"use client";

import Link from "next/link";

export function LibraryViewSwitcher({
  activeView,
}: {
  activeView: "cards" | "locations";
}) {
  return (
    <div className="flex shrink-0 rounded-full border border-white/10 bg-[#181818] p-0.5">
      <Link
        href="/library/cards"
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          activeView === "cards"
            ? "bg-white text-black"
            : "text-white/60 hover:text-white"
        }`}
      >
        Cards
      </Link>
      <Link
        href="/library/locations"
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          activeView === "locations"
            ? "bg-white text-black"
            : "text-white/60 hover:text-white"
        }`}
      >
        Locations
      </Link>
    </div>
  );
}
