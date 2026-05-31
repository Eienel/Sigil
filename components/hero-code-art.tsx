"use client";

/*
  Faint monospace "code art" that drifts behind the hero. Each fragment is a
  small ASCII rendering of something you can seal with Sigil, a photo, an audio
  clip, a document, a video frame, a 3D model. They sit at low opacity so they
  read as texture, not content, and they react to the cursor: fragments near
  the pointer brighten and lift slightly.

  Perpetual motion is isolated here in a client leaf. Transform and opacity
  only. Disabled under prefers-reduced-motion (rendered static and dim).
*/

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

// Compact ASCII art blocks, each tagged with what it represents.
const FRAGMENTS: { art: string; label: string }[] = [
  {
    label: "photo.png",
    art: `┌────────────┐
│░▒▓██▓▒░░▒▓█│
│▒█▓░ ☼ ░▓██▒│
│▓██▒░░░▒▓███│
│▒▓████▓▒░▒▓█│
│ photo.png  │
└────────────┘`,
  },
  {
    label: "track.mp3",
    art: `┌────────────┐
│ ▶  track   │
│▁▃▅▇█▇▅▃▁▂▄▆│
│▂▅█▇▅▃▁▂▄▆█▇│
│ 02:14 ──●─ │
│ track.mp3  │
└────────────┘`,
  },
  {
    label: "paper.pdf",
    art: `┌──────────┐
│ ──────── │
│ ─────    │
│ ──────── │
│ ────     │
│ paper.pdf│
└──────────┘`,
  },
  {
    label: "clip.mp4",
    art: `┌────────────┐
│ ▶ ▢▢▢▢▢▢▢ │
│ ▦▦▦▦▦▦▦▦▦ │
│ frame 0024 │
│ clip.mp4   │
└────────────┘`,
  },
  {
    label: "model.glb",
    art: `    ◢██◣
   ◢████◣
  ◢██████◣
  ◥██████◤
   ◥████◤
  model.glb`,
  },
  {
    label: "sha256",
    art: `sha256 ▸
fddd6cc4 4d03
ae020974 a3ad
40e9db58 6adf
✓ sealed`,
  },
];

type Sprite = {
  el: HTMLPreElement;
  baseX: number; // percentage 0..100
  baseY: number;
  driftX: number;
  driftY: number;
  phase: number;
  speed: number;
  baseOpacity: number;
};

export function HeroCodeArt() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sprites: Sprite[] = Array.from(
      container.querySelectorAll<HTMLPreElement>("[data-sprite]")
    ).map((el, i) => ({
      el,
      baseX: Number(el.dataset.x),
      baseY: Number(el.dataset.y),
      driftX: 0,
      driftY: 0,
      phase: i * 1.7,
      speed: 0.0003 + (i % 3) * 0.00012,
      baseOpacity: Number(el.dataset.op),
    }));

    // Pointer position in container space (px). Far away by default.
    const pointer = { x: -9999, y: -9999 };
    function onMove(e: PointerEvent) {
      const r = container!.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    }
    function onLeave() {
      pointer.x = -9999;
      pointer.y = -9999;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);

    if (reduce) {
      // Static, dim. Position once, no loop.
      for (const s of sprites) {
        s.el.style.opacity = String(s.baseOpacity);
      }
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerleave", onLeave);
      };
    }

    let raf = 0;
    const RADIUS = 160;
    function frame(t: number) {
      const r = container!.getBoundingClientRect();
      for (const s of sprites) {
        // Gentle continuous drift via sine.
        const dx = Math.sin(t * s.speed + s.phase) * 10;
        const dy = Math.cos(t * s.speed * 0.8 + s.phase) * 10;

        // Cursor proximity: distance from sprite center to pointer.
        const cx = (s.baseX / 100) * r.width;
        const cy = (s.baseY / 100) * r.height;
        const ddx = pointer.x - cx;
        const ddy = pointer.y - cy;
        const dist = Math.hypot(ddx, ddy);
        const prox = Math.max(0, 1 - dist / RADIUS); // 0..1

        // Push gently away from the cursor and brighten when near.
        const pushX = prox > 0 ? (-ddx / (dist || 1)) * prox * 14 : 0;
        const pushY = prox > 0 ? (-ddy / (dist || 1)) * prox * 14 : 0;
        const scale = 1 + prox * 0.12;

        s.el.style.transform = `translate(${dx + pushX}px, ${
          dy + pushY
        }px) scale(${scale})`;
        s.el.style.opacity = String(s.baseOpacity + prox * 0.5);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce]);

  // Placement: scattered around the hero, avoiding dead center where the demo
  // card and headline sit. Values are percentages within the container.
  // mobileHide hides fragments that would sit over the headline/copy on narrow
  // screens, where there is no room beside the text.
  const placements = [
    { x: 6, y: 12, op: 0.22, mobileHide: true }, // photo, behind headline on mobile
    { x: 80, y: 8, op: 0.26, mobileHide: false }, // track, top-right open space
    { x: 88, y: 60, op: 0.2, mobileHide: true }, // pdf, right edge
    { x: 9, y: 68, op: 0.24, mobileHide: true }, // clip, over copy on mobile
    { x: 64, y: 84, op: 0.2, mobileHide: false }, // model, bottom area
    { x: 34, y: 90, op: 0.18, mobileHide: false }, // sha256, bottom area
  ];

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {FRAGMENTS.map((f, i) => {
        const p = placements[i % placements.length];
        return (
          <pre
            key={f.label}
            data-sprite
            data-x={p.x}
            data-y={p.y}
            data-op={p.op}
            className={`absolute select-none whitespace-pre font-mono text-[10px] leading-[1.15] text-ink will-change-transform sm:text-[11px] ${
              p.mobileHide ? "hidden sm:block" : ""
            }`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: p.op,
              transform: "translate(0,0)",
            }}
          >
            {f.art}
          </pre>
        );
      })}
    </div>
  );
}
