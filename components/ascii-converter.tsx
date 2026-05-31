"use client";

/*
  Compact live image to ASCII tool. A small upload button on the left, and the
  converted ASCII shown beside it. Conversion is entirely in the browser using
  the same ramp as the baked hero art; nothing is uploaded anywhere.
*/

import { useCallback, useRef, useState } from "react";
import { UploadSimple, Copy, Check, ArrowClockwise } from "@phosphor-icons/react";
import { pixelsToAscii, ASCII_RAMP } from "@/lib/ascii";

export function AsciiConverter() {
  const [ascii, setAscii] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastBitmap = useRef<ImageBitmap | null>(null);

  const render = useCallback(async (bitmap: ImageBitmap) => {
    const w = Math.min(360, bitmap.width);
    const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    setAscii(pixelsToAscii(data, w, h, { width: 54, ramp: ASCII_RAMP }));
  }, []);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      setBusy(true);
      setFileName(file.name);
      try {
        const bitmap = await createImageBitmap(file);
        lastBitmap.current = bitmap;
        await render(bitmap);
      } catch {
        setAscii(null);
      } finally {
        setBusy(false);
      }
    },
    [render]
  );

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
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {/* Left: label + small upload button */}
      <div className="shrink-0 sm:w-56">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Image to ASCII
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Drop an image to see it as code. Converted in your browser, nothing is
          uploaded.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="group relative inline-flex h-9 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-wax px-4 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
            style={{ color: "var(--bg)" }}
          >
            <UploadSimple size={15} weight="regular" />
            {busy ? "Converting" : ascii ? "Replace" : "Upload"}
          </button>
          {ascii && (
            <button
              type="button"
              onClick={reset}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:text-ink"
              aria-label="Reset"
            >
              <ArrowClockwise size={15} weight="regular" />
            </button>
          )}
        </div>
      </div>

      {/* Right: result, or a slim placeholder */}
      <div className="min-w-0 flex-1">
        {ascii ? (
          <div className="rounded-xl border border-hairline bg-surface p-3">
            <div className="overflow-x-auto">
              <pre className="whitespace-pre font-mono text-[6px] leading-[1.05] text-ink sm:text-[7px]">
                {ascii}
              </pre>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2">
              <span className="truncate font-mono text-[11px] text-muted">
                {fileName}
              </span>
              <button
                type="button"
                onClick={copy}
                className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-ink"
              >
                {copied ? (
                  <>
                    <Check size={13} weight="regular" style={{ color: "var(--verified)" }} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={13} weight="regular" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex h-full min-h-[88px] w-full items-center justify-center rounded-xl border border-dashed border-hairline bg-surface px-4 text-sm text-muted transition-colors hover:border-wax"
          >
            The ASCII rendering shows up here
          </button>
        )}
      </div>
    </div>
  );
}
