"use client";

/*
  Full-page ambient ASCII field. A grid of faint monospace glyphs covers the
  whole viewport, invisible at rest. A soft spotlight around the cursor reveals
  the characters near it, so moving the mouse lights up hidden code.

  Purely decorative and fully isolated: a fixed canvas with pointer-events none
  sitting above page content but below the nav, so it never blocks clicks or
  changes layout. Only cells near the cursor are drawn each frame, so it is
  cheap. Disabled on touch / no-hover devices and under reduced motion.
*/

import { useEffect, useRef } from "react";

const CELL = 16; // px between glyphs
const RADIUS = 58; // reveal radius in px
const MAX_ALPHA = 0.62; // brightest a revealed glyph gets
const GLYPHS = "01<>/{}=+*;:#%$".split("");

export function CursorAscii() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Respect reduced motion and skip devices without a hovering pointer.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduce || !hover) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cols = 0;
    let rows = 0;
    let chars: string[] = []; // stable glyph per cell

    let fg = readToken("--fg") || "#15120e";
    let accent = readToken("--accent") || "#7c2d2d";
    let isDark = document.documentElement.classList.contains("dark");
    function readToken(name: string) {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    }
    // Glow color for the glyph halo. Dark mode glows because light glyphs sit
    // on a dark field; in light mode we tint the halo with the wax accent so it
    // reads as a warm luminous spot rather than plain dark text. The canvas
    // shadow API needs a concrete color, so we use the resolved token.
    function glowColor() {
      return isDark ? fg : accent;
    }
    // Apply an alpha to a resolved color (hex or rgb[a]) for canvas gradients.
    function withAlpha(color: string, a: number): string {
      let rgb = color;
      if (color.startsWith("#")) {
        const h = color.slice(1);
        const f =
          h.length === 3
            ? h.split("").map((x) => x + x).join("")
            : h.padEnd(6, "0").slice(0, 6);
        const n = parseInt(f, 16);
        rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
      } else {
        const m = color.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
        rgb = m ? `${m[1]}, ${m[2]}, ${m[3]}` : "124, 45, 45";
      }
      return `rgba(${rgb}, ${a})`;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.font = "11px ui-monospace, monospace";
      ctx!.textBaseline = "middle";
      ctx!.textAlign = "center";
      cols = Math.ceil(w / CELL) + 1;
      rows = Math.ceil(h / CELL) + 1;
      chars = new Array(cols * rows);
      for (let i = 0; i < chars.length; i++) {
        chars[i] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
    }
    resize();

    const pointer = { x: -9999, y: -9999, active: false };
    let raf = 0;
    let running = false;

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      if (!pointer.active) {
        running = false;
        return; // nothing to reveal; stop the loop until next move
      }

      // Soft radial backing so the spotlight reads as a warm glow, in light
      // mode too (the wax tint), not just dark text.
      const halo = ctx!.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        RADIUS
      );
      // Light mode reads brighter, so keep its glow gentler than dark mode.
      const haloAlpha = isDark ? 0.09 : 0.04;
      halo.addColorStop(0, withAlpha(isDark ? fg : accent, haloAlpha));
      halo.addColorStop(1, withAlpha(isDark ? fg : accent, 0));
      ctx!.fillStyle = halo;
      ctx!.beginPath();
      ctx!.arc(pointer.x, pointer.y, RADIUS, 0, Math.PI * 2);
      ctx!.fill();

      // Glyphs, each with a soft halo via shadowBlur for the glow.
      ctx!.fillStyle = fg;
      ctx!.shadowColor = glowColor();
      const maxAlpha = isDark ? MAX_ALPHA : 0.4;
      const blurScale = isDark ? 6 : 3;
      const minCol = Math.max(0, Math.floor((pointer.x - RADIUS) / CELL));
      const maxCol = Math.min(cols - 1, Math.ceil((pointer.x + RADIUS) / CELL));
      const minRow = Math.max(0, Math.floor((pointer.y - RADIUS) / CELL));
      const maxRow = Math.min(rows - 1, Math.ceil((pointer.y + RADIUS) / CELL));

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const cx = c * CELL + CELL / 2;
          const cy = r * CELL + CELL / 2;
          const dist = Math.hypot(cx - pointer.x, cy - pointer.y);
          if (dist > RADIUS) continue;
          // Smooth falloff, brightest at the center of the spotlight.
          const t = 1 - dist / RADIUS;
          ctx!.globalAlpha = t * t * maxAlpha;
          ctx!.shadowBlur = blurScale * t; // halo strongest at the center
          ctx!.fillText(chars[r * cols + c], cx, cy);
        }
      }
      ctx!.globalAlpha = 1;
      ctx!.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    }

    function ensureRunning() {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    }

    function onMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      ensureRunning();
    }
    function onLeave() {
      pointer.active = false; // next frame clears and stops
    }

    function onResize() {
      resize();
    }

    // React to light/dark toggle so the glyph color and glow stay correct.
    const themeObserver = new MutationObserver(() => {
      fg = readToken("--fg") || fg;
      accent = readToken("--accent") || accent;
      isDark = document.documentElement.classList.contains("dark");
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      // Behind page content (negative z) but above the html background, so
      // glyphs reveal in open areas and never draw over buttons or text.
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
