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

// Cream seal that reads on the wax header band: cream rim and body, wax monogram.
function sealDataUri(): string {
  const teeth = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const cx = (50 + Math.cos(a) * 44).toFixed(2);
    const cy = (50 + Math.sin(a) * 44).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="3.2"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <g fill="#FCFAF4">${teeth}</g>
    <circle cx="50" cy="50" r="44" fill="#FCFAF4"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="#7C2D2D" stroke-opacity="0.35" stroke-width="1.5"/>
    <g fill="none" stroke="#7C2D2D" stroke-opacity="0.9" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
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
          fontFamily: "sans-serif",
        }}
      >
        {/* Wax header band */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            background: "#7C2D2D",
            padding: "40px 64px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sealDataUri()} width={88} height={88} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 42, fontWeight: 700, color: "#FCFAF4" }}>
              Sealed on Sigil
            </div>
            <div style={{ fontSize: 24, color: "rgba(252,250,244,0.78)" }}>
              {`${prov}${label ? ` , ${label}` : ""}`}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "40px 64px",
            gap: 18,
          }}
        >
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div
                style={{
                  width: 210,
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#7C2D2D",
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

        {/* Wax footer band */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: "auto",
            background: "#7C2D2D",
            padding: "20px 64px",
            fontSize: 22,
            color: "#FCFAF4",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#FCFAF4",
            }}
          />
          Stored on Walrus, attested on Sui through Tatum. getsigil.xyz
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
