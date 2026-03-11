"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { BookOpen, ClipboardList, Hammer } from "lucide-react";

const tabs = [
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/deckbuilder", label: "Deckbuilder", icon: Hammer },
  { href: "/decks", label: "Decks", icon: ClipboardList },
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
      <div className="w-full px-4 py-3 sm:px-6 sm:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:flex md:items-center md:justify-between">
          <Link
            href="/library"
            className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-[0.08em] text-white sm:text-xl"
          >
            <Image
              src="/icons/Origins_Icon_Logo_Colored.png"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
            <span className="leading-none">rigins Base</span>
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#202020] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:flex">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
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

          <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-[#202020] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:hidden">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-label={tab.label}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                    isActive
                      ? "bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,0.14)]"
                      : "text-white/68 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center justify-self-end gap-2 sm:gap-3">
            {!isLoaded ? null : isSignedIn ? (
              <>
                <span className="hidden max-w-40 truncate rounded-full border border-white/10 bg-[#202020] px-3 py-1.5 text-sm font-medium text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:inline-flex">
                  {displayName}
                </span>
                <UserButton />
              </>
            ) : (
              <SignInButton mode="modal">
                <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-white px-3 text-xs font-medium text-black transition hover:bg-white/90 sm:h-10 sm:px-4 sm:text-sm">
                  Login
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
