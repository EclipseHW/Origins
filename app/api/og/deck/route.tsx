import { ImageResponse } from "next/og";
import {
  getDeckShareCards,
  getDeckShareDescription,
  getDeckShareMetaParts,
} from "@/lib/deck-share";
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
        width: 136,
        height: 198,
        overflow: "hidden",
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: "#1a1a1a",
      }}
    >
      {artUrl ? (
        <img
          src={artUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
    </div>
  );
}

function DeckPreviewImage({
  deckName,
  metaParts,
  description,
  cardImageUrls,
}: {
  deckName: string;
  metaParts: string[];
  description: string;
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
        background: "#0f0f10",
        padding: 36,
        color: "#ffffff",
        fontFamily:
          '"Nunito Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "#141414",
          boxShadow: "0 16px 32px rgba(0,0,0,0.2)",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            flexDirection: "column",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {deckName}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.2,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {metaParts.map((part, index) => (
              <div
                key={`${part}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                {index > 0 ? (
                  <span style={{ marginRight: 10, color: "rgba(255,255,255,0.55)" }}>|</span>
                ) : null}
                <span>{part}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.62)",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {firstRow.map((card, index) => (
              <DeckCardImage
                key={`first-row-${index}`}
                artUrl={card.url}
                borderColor={card.isLegendary ? "rgba(224,193,90,0.4)" : "rgba(255,255,255,0.06)"}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
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
            background: "#0f0f10",
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
      <DeckPreviewImage
        deckName={deck.deckName || "Untitled Deck"}
        metaParts={getDeckShareMetaParts(deck)}
        description={getDeckShareDescription(deck)}
        cardImageUrls={cardImageUrls}
      />
    ),
    IMAGE_SIZE,
  );
}
