import Link from "next/link";

const publicDecks = [
  {
    name: "Moonlit Discard",
    author: "originsbase",
    summary: "A discard-heavy control list built around Dracula and Swan recursion.",
  },
  {
    name: "Sherwood Tempo",
    author: "robinfan",
    summary: "Fast board pressure with Merry Men, movement effects, and curve efficiency.",
  },
  {
    name: "Honey Ramp",
    author: "poohstack",
    summary: "A slower stat-growth deck with item support and sticky mid-game boards.",
  },
] as const;

export default function DecksPage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Public Decks
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Published lists and saved ideas.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-300">
          This route is the natural home for public deck URLs, saved drafts,
          filtering, and profile-level deck listings.
        </p>
      </div>

      <div className="grid gap-4">
        {publicDecks.map((deck) => (
          <article
            key={deck.name}
            className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  by {deck.author}
                </p>
                <h2 className="text-2xl font-semibold text-slate-950">
                  {deck.name}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  {deck.summary}
                </p>
              </div>
              <Link
                href="/deckbuilder"
                className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                Open in builder
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
