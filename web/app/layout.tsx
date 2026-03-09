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
      <body className={`${nunitoSans.variable} antialiased`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <div className="min-h-screen text-slate-100">
              <SiteHeader />
              <div className="w-full px-6 py-10">{children}</div>
            </div>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
