/**
 * Image to ASCII conversion, shared by the build-time bake script and the live
 * in-browser upload tool so both render with the same look.
 *
 * The ramp goes from light to dark (paper to ink). We sample the image down to
 * a character grid, map each cell's luminance to a ramp character, and join
 * into lines. Monospace cells are taller than wide, so we squash the vertical
 * sampling to keep proportions right.
 */

// Light to dark. First char is for the brightest pixels, last for the darkest.
export const ASCII_RAMP = " .:-=+*#%@";
// A denser ramp with block shading, nicer for the wax/paper aesthetic.
export const ASCII_RAMP_BLOCKS = " .:-=+*o░▒▓█";

// Monospace glyphs are roughly twice as tall as wide; correct for it.
export const CHAR_ASPECT = 0.5;

export type AsciiOptions = {
  width?: number; // target columns
  ramp?: string;
  invert?: boolean; // invert luminance (for dark backgrounds)
};

/**
 * Convert raw RGBA pixel data (from a canvas) at the given source dimensions
 * into ASCII text. This is environment agnostic: feed it ImageData-like bytes.
 */
export function pixelsToAscii(
  data: Uint8ClampedArray | Uint8Array,
  srcWidth: number,
  srcHeight: number,
  opts: AsciiOptions = {}
): string {
  const ramp = opts.ramp ?? ASCII_RAMP;
  const cols = Math.max(8, opts.width ?? 60);
  // Keep aspect ratio, then squash vertically for the monospace cell shape.
  const rows = Math.max(
    4,
    Math.round((srcHeight / srcWidth) * cols * CHAR_ASPECT)
  );

  const cellW = srcWidth / cols;
  const cellH = srcHeight / rows;
  const lines: string[] = [];

  for (let ry = 0; ry < rows; ry++) {
    let line = "";
    for (let rx = 0; rx < cols; rx++) {
      // Average luminance over the cell.
      const x0 = Math.floor(rx * cellW);
      const x1 = Math.min(srcWidth, Math.floor((rx + 1) * cellW));
      const y0 = Math.floor(ry * cellH);
      const y1 = Math.min(srcHeight, Math.floor((ry + 1) * cellH));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * srcWidth + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3] / 255;
          // Rec. 601 luma, premultiplied by alpha over a white background.
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) * a + 255 * (1 - a);
          sum += lum;
          count++;
        }
      }
      let lum = count ? sum / count / 255 : 1; // 0..1, 1 = bright
      if (opts.invert) lum = 1 - lum;
      // Bright -> first ramp char, dark -> last.
      const idx = Math.min(
        ramp.length - 1,
        Math.max(0, Math.round((1 - lum) * (ramp.length - 1)))
      );
      line += ramp[idx];
    }
    lines.push(line.replace(/\s+$/g, "")); // trim trailing space per line
  }
  return lines.join("\n");
}
