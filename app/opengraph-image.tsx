import { ImageResponse } from "next/og";

// Social card shown when getsigil.xyz is pasted into Twitter, Discord, etc.
export const alt =
  "Sigil, a verifiable provenance layer on Sui. Stored on Walrus, attested on Sui through Tatum.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The wax seal signet, built as an SVG string so it renders crisply in the card.
function sealDataUri(): string {
  const teeth = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const cx = (50 + Math.cos(a) * 44).toFixed(2);
    const cy = (50 + Math.sin(a) * 44).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="3.2"/>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <g fill="#7C2D2D">${teeth}</g>
    <circle cx="50" cy="50" r="44" fill="#7C2D2D"/>
    <circle cx="50" cy="46" r="40" fill="#ffffff" fill-opacity="0.1"/>
    <circle cx="50" cy="56" r="40" fill="#000000" fill-opacity="0.12"/>
    <circle cx="50" cy="50" r="38" fill="#7C2D2D"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>
    <g fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M61 38 C61 31 39 31 39 41 C39 51 61 49 61 59 C61 69 39 69 39 62"/>
      <path d="M50 30 L50 70" stroke-opacity="0.5"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F6F2EA",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top row: seal + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sealDataUri()} width={84} height={84} alt="" />
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#15120E",
              letterSpacing: -1,
            }}
          >
            Sigil
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            color: "#15120E",
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          A verifiable provenance layer on Sui.
        </div>

        {/* Bottom row: the rail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 30,
            color: "#6A6358",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 14,
              height: 14,
              borderRadius: 7,
              background: "#7C2D2D",
            }}
          />
          Stored on Walrus, attested on Sui through Tatum.
        </div>
      </div>
    ),
    { ...size },
  );
}
