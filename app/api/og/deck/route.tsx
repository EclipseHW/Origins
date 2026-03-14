import { ImageResponse } from "next/og";
import { getDeckShareCards } from "@/lib/deck-share";
import { getPublishedDeckByParam } from "@/lib/published-decks";

export const runtime = "nodejs";

const IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

function DeckCardImage({
  artUrl,
  borderColor,
}: {
  artUrl: string | null;
  borderColor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: 181,
        height: 264,
        overflow: "hidden",
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: "#1a1a1a",
      }}
    >
      {artUrl ? (
        <>
          {/* next/image is not supported inside next/og ImageResponse markup. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function DeckPreviewImage({
  cardImageUrls,
}: {
  cardImageUrls: Array<{ url: string | null; isLegendary: boolean }>;
}) {
  const firstRow = cardImageUrls.slice(0, 7);
  const secondRow = cardImageUrls.slice(7, 14);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "#141414",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {firstRow.map((card, index) => (
            <DeckCardImage
              key={`first-row-${index}`}
              artUrl={card.url}
              borderColor={card.isLegendary ? "rgba(224,193,90,0.4)" : "rgba(255,255,255,0.06)"}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {secondRow.map((card, index) => (
            <DeckCardImage
              key={`second-row-${index}`}
              artUrl={card.url}
              borderColor={card.isLegendary ? "rgba(224,193,90,0.4)" : "rgba(255,255,255,0.06)"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const deckId = requestUrl.searchParams.get("deck");
  const deck = await getPublishedDeckByParam(deckId);

  if (!deck) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            background: "#141414",
            color: "#ffffff",
            fontSize: 48,
            fontWeight: 700,
            fontFamily:
              '"Nunito Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Origins Base
        </div>
      ),
      IMAGE_SIZE,
    );
  }

  const origin = requestUrl.origin;
  const cardImageUrls = getDeckShareCards(deck).map((item) => ({
    url: item.card ? new URL(`/${item.card.artPath}`, origin).toString() : null,
    isLegendary: item.isLegendary,
  }));

  return new ImageResponse(
    (
      <DeckPreviewImage cardImageUrls={cardImageUrls} />
    ),
    IMAGE_SIZE,
  );
}
