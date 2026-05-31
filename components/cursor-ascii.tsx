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
const RADIUS = 78; // reveal radius in px
const MAX_ALPHA = 0.5; // brightest a revealed glyph gets
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

    let fg = readFg();
    function readFg() {
      const c = getComputedStyle(document.documentElement)
        .getPropertyValue("--fg")
        .trim();
      return c || "#15120e";
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
      ctx!.fillStyle = fg;

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
          ctx!.globalAlpha = t * t * MAX_ALPHA;
          ctx!.fillText(chars[r * cols + c], cx, cy);
        }
      }
      ctx!.globalAlpha = 1;
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

    // React to light/dark toggle so the glyph color stays correct.
    const themeObserver = new MutationObserver(() => {
      fg = readFg();
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
