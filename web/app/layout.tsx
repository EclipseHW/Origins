import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Nunito_Sans } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-site",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Origins Deckbuilder",
  description: "A Next.js deckbuilder scaffold with Convex and Clerk auth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunitoSans.variable} h-screen overflow-hidden antialiased`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <div className="flex h-screen flex-col overflow-hidden text-slate-100">
              <SiteHeader />
              <div className="flex-1 min-h-0 w-full overflow-auto px-6 pb-0 pt-10">
                {children}
              </div>
            </div>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
