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
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(135deg, #4A1A1A 0%, #1A0E0C 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Soft glow orbs for depth */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(162,58,58,0.55) 0%, rgba(162,58,58,0) 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -180,
            left: -140,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124,45,45,0.45) 0%, rgba(124,45,45,0) 70%)",
          }}
        />

        {/* Frosted glass card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 1040,
            padding: "48px 56px",
            borderRadius: 32,
            background: "rgba(252,250,244,0.06)",
            border: "1px solid rgba(252,250,244,0.16)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.40)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sealDataUri()} width={84} height={84} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#FCFAF4" }}>
                Sealed on Sigil
              </div>
              <div style={{ fontSize: 23, color: "rgba(252,250,244,0.72)" }}>
                {`${prov}${label ? ` , ${label}` : ""}`}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              height: 1,
              background: "rgba(252,250,244,0.14)",
              margin: "30px 0",
            }}
          />

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                <div
                  style={{
                    width: 200,
                    fontSize: 18,
                    fontWeight: 600,
                    color: "rgba(252,250,244,0.55)",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                  }}
                >
                  {k}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    color: "#FCFAF4",
                    fontFamily: "monospace",
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              height: 1,
              background: "rgba(252,250,244,0.14)",
              margin: "30px 0 24px",
            }}
          />

          {/* Footer rail */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 20,
              color: "rgba(252,250,244,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 11,
                height: 11,
                borderRadius: 6,
                background: "#A23A3A",
              }}
            />
            Stored on Walrus, attested on Sui through Tatum. getsigil.xyz
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
