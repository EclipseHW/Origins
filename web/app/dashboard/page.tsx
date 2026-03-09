import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
            Protected Route
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Welcome back, {user.firstName ?? user.username ?? "builder"}.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300">
            Clerk is active, the route is protected, and the app is ready for
            Convex schema and deck data once you run `npx convex dev`.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Auth</p>
            <p className="mt-2 text-sm text-slate-300">
              Session comes from Clerk on a protected App Router page.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Convex</p>
            <p className="mt-2 text-sm text-slate-300">
              Provider wiring is in place and waiting for your deployment URL.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Assets</p>
            <p className="mt-2 text-sm text-slate-300">
              WebP card art now lives under `public/assets`.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium transition hover:border-cyan-300"
        >
          Back to landing page
        </Link>
      </div>
    </main>
  );
}
