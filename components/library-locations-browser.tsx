"use client";

import { useMemo, useState, type ReactNode } from "react";
import { LibraryViewSwitcher } from "@/components/library-view-switcher";
import { locations, type LocationDefinition } from "@/lib/locations";

function parseLocationEffect(effect: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const regex = /<b>|<\/b>|<color=(#?\w+)>|<\/color>/g;
  let lastIndex = 0;
  let bold = false;
  let color: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(effect)) !== null) {
    if (match.index > lastIndex) {
      const text = effect.slice(lastIndex, match.index);
      tokens.push(
        <span
          key={lastIndex}
          style={{ color: color ?? undefined }}
          className={bold ? "font-semibold" : ""}
        >
          {text}
        </span>,
      );
    }

    lastIndex = regex.lastIndex;

    if (match[0] === "<b>") {
      bold = true;
    } else if (match[0] === "</b>") {
      bold = false;
    } else if (match[0] === "</color>") {
      color = null;
    } else if (match[1]) {
      color = match[1] === "red" ? "#ef4444" : match[1];
    }
  }

  if (lastIndex < effect.length) {
    tokens.push(
      <span
        key={lastIndex}
        style={{ color: color ?? undefined }}
        className={bold ? "font-semibold" : ""}
      >
        {effect.slice(lastIndex)}
      </span>,
    );
  }

  return tokens;
}

function LocationRow({ location }: { location: LocationDefinition }) {
  return (
    <div className="border-b border-white/6 px-4 py-3 transition hover:bg-white/3">
      <p className="text-sm font-bold tracking-tight text-white">{location.name}</p>
      <p className="mt-0.5 text-[0.8rem] leading-relaxed text-white/50">
        {parseLocationEffect(location.effect)}
      </p>
    </div>
  );
}

export function LibraryLocationsBrowser() {
  const [query, setQuery] = useState("");
  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
      return locations;
    }

    return locations.filter((location) => {
      const searchable = `${location.name} ${location.effect}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [query]);

  return (
    <section className="relative isolate space-y-8 pb-5">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[24px] border border-white/12 bg-[#1c1c1c] shadow-[0_22px_44px_rgba(0,0,0,0.32)] ring-1 ring-white/5">
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <LibraryViewSwitcher activeView="locations" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search locations..."
              className="h-9 min-w-56 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/32"
            />
          </div>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-[26px] border border-white/12 bg-[#1c1c1c] px-6 py-10 text-center shadow-[0_22px_44px_rgba(0,0,0,0.32)] ring-1 ring-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Locations
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            No location data has been added yet.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/70">
            Add records to <code>lib/locations.ts</code> and this page will render them with search
            and rich-text effect formatting.
          </p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/10 bg-[#141414] px-6 py-10 text-center text-sm text-white/40">
          No locations match your search.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[#141414] md:columns-2 md:gap-0">
          {filteredLocations.map((location) => (
            <LocationRow key={location.name} location={location} />
          ))}
        </div>
      )}
    </section>
  );
}
