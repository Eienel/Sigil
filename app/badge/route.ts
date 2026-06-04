/*
  Embeddable "Verified by Sigil" badge as an SVG, served at /badge. Sites can
  embed it next to content they have sealed, linking it to their verify page.
*/
export const dynamic = "force-static";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="32" viewBox="0 0 168 32" role="img" aria-label="Verified by Sigil">
  <rect width="168" height="32" rx="16" fill="#7C2D2D"/>
  <g transform="translate(10,6)" fill="#FCFAF4">
    <circle cx="10" cy="10" r="10" fill="#FCFAF4" fill-opacity="0.14"/>
    <circle cx="10" cy="10" r="8.5" fill="none" stroke="#FCFAF4" stroke-opacity="0.5" stroke-width="1"/>
    <g fill="none" stroke="#FCFAF4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12.6 7 C12.6 5.6 7.4 5.6 7.4 7.6 C7.4 9.6 12.6 9.2 12.6 11.2 C12.6 13.2 7.4 13.2 7.4 11.7"/>
    </g>
  </g>
  <text x="40" y="20" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" fill="#FCFAF4" font-weight="600">Verified by Sigil</text>
</svg>`;

export function GET() {
  return new Response(SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
