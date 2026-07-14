/**
 * imgify — image generation
 *
 * The prompt text is rendered onto a local PNG using @napi-rs/canvas. No AI
 * image model and no API key are required.
 *
 * The result is returned as a Buffer and optionally saved to disk.
 */

import { resolve as resolvePath } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { ImgifyConfig } from "./config";

export interface GeneratedImage {
  /** PNG image buffer */
  buffer: Buffer;
  /** Filesystem path of the saved copy, if it could be written. */
  path?: string;
}

/** Wrap text, save a PNG copy, and return the buffer plus path. */
async function saveAndWrap(
  png: Buffer,
  config: ImgifyConfig,
  baseName: string,
): Promise<GeneratedImage> {
  try {
    await mkdir(config.outputDir, { recursive: true });
    const path = resolvePath(config.outputDir, `${baseName}-${Date.now()}.png`);
    await writeFile(path, png);
    return { buffer: png, path };
  } catch {
    // Saving to disk is best-effort; the buffer is what matters.
    return { buffer: png };
  }
}

function wrapText(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Pick a usable sans-serif font family via @napi-rs/canvas fontconfig support. */
function resolveFontFamily(
  explicit: string | undefined,
  GlobalFonts: typeof import("@napi-rs/canvas")["GlobalFonts"],
): string {
  if (explicit) return explicit;
  // Load system fonts so family names resolve when used in ctx.font.
  GlobalFonts.loadFontsFromDir("/usr/share/fonts");
  const families = GlobalFonts.families;
  const preferred =
    families.find((f) => /noto sans|dejavu|liberation|arial|sans/i.test(f.family)) ??
    families[0];
  return preferred?.family ?? "sans-serif";
}

/** Render the prompt text onto a PNG image. */
export async function renderTextToImage(
  text: string,
  config: ImgifyConfig,
  _signal?: AbortSignal,
): Promise<GeneratedImage> {
  const { createCanvas, GlobalFonts } = await import("@napi-rs/canvas");
  const { render } = config;

  const family = resolveFontFamily(render.fontFamily, GlobalFonts);
  const font = `${render.fontSize}px ${family}`;

  // First pass: measure to compute the required canvas height.
  const measuring = createCanvas(render.maxWidth, 10);
  const mctx = measuring.getContext("2d");
  mctx.font = font;
  const lines = wrapText(
    (t) => mctx.measureText(t).width,
    text,
    render.maxWidth - render.padding * 2,
  );

  const lineHeight = Math.round(render.fontSize * 1.4);
  const height = render.padding * 2 + lines.length * lineHeight;

  const canvas = createCanvas(render.maxWidth, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = render.background;
  ctx.fillRect(0, 0, render.maxWidth, height);
  ctx.fillStyle = render.foreground;
  ctx.font = font;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, render.padding, render.padding + i * lineHeight);
  });

  const png = canvas.toBuffer("image/png");
  return saveAndWrap(png, config, "render");
}

/** Convert a prompt into an image (locally rendered text). */
export async function generateImage(
  prompt: string,
  config: ImgifyConfig,
  signal?: AbortSignal,
): Promise<GeneratedImage> {
  return renderTextToImage(prompt, config, signal);
}
