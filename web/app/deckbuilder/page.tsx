import Image from "next/image";
import { currentUser } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";

const deckSlots = [
  "Dracula",
  "Beautiful Swan",
  "Merry Man",
  "Robin Hood",
  "Winnie-the-Pooh",
  "Musketeer",
] as const;

export default async function DeckbuilderPage() {
  const user = await currentUser();

  return (
    <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[32px] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Deckbuilder
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Assemble the list.
          </h1>
          <p className="text-base leading-7 text-slate-600">
            This page is set up as the working area for your builder UI and save
            flow.
          </p>
        </div>

        {!user ? (
          <div className="mt-8 rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-lg font-semibold">Login to start saving decks.</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              You can browse the structure now, but auth should gate actual deck
              persistence.
            </p>
            <div className="mt-5">
              <SignInButton mode="modal">
                <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                  Login
                </button>
              </SignInButton>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {deckSlots.map((slot, index) => (
              <div
                key={slot}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Slot {index + 1}
                  </p>
                  <p className="font-semibold text-slate-900">{slot}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  x1
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(160deg,_#111827,_#1e293b)] p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
          Featured Card
        </p>
        <div className="mt-5 grid gap-6 md:grid-cols-[280px_1fr] md:items-start">
          <Image
            src="/assets/dracula.webp"
            alt="Dracula"
            width={275}
            height={400}
            className="h-auto w-full rounded-[24px] border border-white/10"
            priority
          />
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight">Dracula</h2>
            <p className="max-w-xl text-sm leading-7 text-slate-300">
              Use this panel for card details, mana curve, filters, and synergy
              suggestions as the actual builder logic comes online.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Save flow</p>
                <p className="mt-2 text-sm text-slate-300">
                  Hook this panel to a Convex mutation when you wire deck saves.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Publishing</p>
                <p className="mt-2 text-sm text-slate-300">
                  Add a public/private toggle and slug generation for sharing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
