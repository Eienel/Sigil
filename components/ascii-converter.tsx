"use client";

/*
  Live image to ASCII tool. Drop an image, it draws to an offscreen canvas and
  renders monospace ASCII in the browser using the same ramp as the baked hero
  art. Nothing is uploaded; conversion is entirely client side. The result can
  be copied. This doubles as a tease of what Sigil seals: any file becomes a
  compact, verifiable mark.
*/

import { useCallback, useRef, useState } from "react";
import { UploadSimple, Copy, Check, ArrowClockwise } from "@phosphor-icons/react";
import { pixelsToAscii, ASCII_RAMP } from "@/lib/ascii";

const MAX_COLS = 80;

export function AsciiConverter() {
  const [ascii, setAscii] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cols, setCols] = useState(64);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastBitmap = useRef<ImageBitmap | null>(null);

  const render = useCallback(async (bitmap: ImageBitmap, columns: number) => {
    // Draw to a canvas sized to the image, read pixels, convert.
    const maxW = 360;
    const scale = Math.min(1, maxW / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    // White backdrop so transparent PNGs map to paper, not black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const art = pixelsToAscii(data, w, h, { width: columns, ramp: ASCII_RAMP });
    setAscii(art);
  }, []);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      setBusy(true);
      setFileName(file.name);
      try {
        const bitmap = await createImageBitmap(file);
        lastBitmap.current = bitmap;
        await render(bitmap, cols);
      } catch {
        setAscii(null);
      } finally {
        setBusy(false);
      }
    },
    [cols, render]
  );

  async function changeCols(next: number) {
    setCols(next);
    if (lastBitmap.current) await render(lastBitmap.current, next);
  }

  async function copy() {
    if (!ascii) return;
    try {
      await navigator.clipboard.writeText(ascii);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function reset() {
    setAscii(null);
    setFileName("");
    lastBitmap.current = null;
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Image to ASCII
        </span>
        {ascii && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
          >
            <ArrowClockwise size={14} weight="regular" />
            Reset
          </button>
        )}
      </div>

      {!ascii ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          disabled={busy}
          className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 transition-colors ${
            dragOver ? "border-wax bg-paper" : "border-hairline bg-paper"
          } ${busy ? "opacity-60" : "hover:border-wax"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <UploadSimple size={24} weight="regular" className="mb-2 text-muted" />
          <span className="text-sm text-ink">
            {busy ? "Converting" : "Drop an image to see it as ASCII"}
          </span>
          <span className="mt-1 text-xs text-muted">
            Converted in your browser, nothing is uploaded
          </span>
        </button>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-xl border border-hairline bg-paper p-3">
            <pre className="whitespace-pre font-mono text-[6px] leading-[1.05] text-ink sm:text-[7px]">
              {ascii}
            </pre>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              Detail
              <input
                type="range"
                min={32}
                max={MAX_COLS}
                step={4}
                value={cols}
                onChange={(e) => changeCols(Number(e.target.value))}
                className="accent-[var(--accent)]"
              />
            </label>
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
            >
              {copied ? (
                <>
                  <Check size={14} weight="regular" style={{ color: "var(--verified)" }} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} weight="regular" />
                  Copy text
                </>
              )}
            </button>
            {fileName && (
              <span className="truncate font-mono text-xs text-muted">
                {fileName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
