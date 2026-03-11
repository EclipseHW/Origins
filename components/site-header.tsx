"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

const tabs = [
  { href: "/library", label: "Library" },
  { href: "/deckbuilder", label: "Deckbuilder" },
  { href: "/decks", label: "Decks" },
] as const;

function capitalizeFirstLetter(value: string) {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const displayName =
    (user?.username ? capitalizeFirstLetter(user.username) : null) ??
    user?.fullName ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress ??
    "Account";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1a1a1a]/96 shadow-[0_18px_42px_rgba(0,0,0,0.36)] ring-1 ring-inset ring-white/5 backdrop-blur-2xl">
      <div className="flex w-full items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            href="/library"
            className="flex items-center gap-2 text-xl font-bold tracking-[0.08em] text-white"
          >
            <Image
              src="/icons/Origins_Icon_Logo_Colored.png"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
            <span>rigins Base</span>
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#202020] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:flex">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,0.14)]"
                      : "text-white/68 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!isLoaded ? null : isSignedIn ? (
            <>
              <span className="max-w-40 truncate rounded-full border border-white/10 bg-[#202020] px-3 py-1.5 text-sm font-medium text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                {displayName}
              </span>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="rounded-full border border-white/12 bg-[#202020] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/28 hover:bg-[#252525] hover:text-white">
                  Login
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90">
                  Sign up
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
