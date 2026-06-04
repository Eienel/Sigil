import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// A downloadable certificate image (1200x630) for a sealed attestation. Fields
// come in as query params from the certificate view.
export const runtime = "nodejs";

const PROV: Record<string, string> = {
  "0": "Human made",
  "1": "AI generated",
  "2": "AI assisted",
};

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
    <circle cx="50" cy="50" r="38" fill="#7C2D2D"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>
    <g fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M61 38 C61 31 39 31 39 41 C39 51 61 49 61 59 C61 69 39 69 39 62"/>
      <path d="M50 30 L50 70" stroke-opacity="0.5"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function short(s: string, head = 14, tail = 10): string {
  if (!s) return "";
  return s.length > head + tail + 3 ? `${s.slice(0, head)}...${s.slice(-tail)}` : s;
}

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const file = q.get("file") ?? "file";
  const sha256 = q.get("sha256") ?? "";
  const blob = q.get("blob") ?? "";
  const object = q.get("object") ?? "";
  const digest = q.get("digest") ?? "";
  const prov = PROV[q.get("prov") ?? "0"] ?? "Human made";
  const label = q.get("label") ?? "";

  const rows: [string, string][] = [
    ["File", short(file, 40, 0)],
    ["sha256", short(sha256)],
    ["Walrus blob", short(blob)],
    ...(object ? ([["Sigil ID", short(object)]] as [string, string][]) : []),
    ["Tx digest", short(digest)],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#F6F2EA",
          padding: "56px 64px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sealDataUri()} width={72} height={72} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#15120E" }}>
              Sealed on Sigil
            </div>
            <div style={{ fontSize: 22, color: "#6A6358" }}>
              {`${prov}${label ? ` , ${label}` : ""}`}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 44,
            gap: 18,
          }}
        >
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div
                style={{
                  width: 200,
                  fontSize: 20,
                  color: "#6A6358",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {k}
              </div>
              <div
                style={{
                  fontSize: 26,
                  color: "#15120E",
                  fontFamily: "monospace",
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Footer rail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: "auto",
            fontSize: 22,
            color: "#6A6358",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#7C2D2D",
            }}
          />
          Stored on Walrus, attested on Sui through Tatum. getsigil.xyz
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
