import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Nunito_Sans, Geist } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { DeckCacheProvider } from "@/components/deck-cache-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const nunitoSans = Nunito_Sans({
  variable: "--font-site",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Origins Base",
  description: "Explore cards, build and find best decks",
  openGraph: {
    title: "Origins Base",
    description: "Explore cards, build and find best decks",
  },
  twitter: {
    title: "Origins Base",
    description: "Explore cards, build and find best decks",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${nunitoSans.variable} h-screen overflow-hidden antialiased`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <DeckCacheProvider>
              <div className="flex h-screen flex-col overflow-hidden text-slate-100">
                <SiteHeader />
                <div className="flex-1 min-h-0 w-full overflow-auto px-6 pb-0 pt-10">
                  {children}
                </div>
              </div>
            </DeckCacheProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
