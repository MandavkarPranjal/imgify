/**
 * imgify — image generation
 *
 * The prompt text is rendered onto a local PNG using @napi-rs/canvas. No AI
 * image model and no API key are required.
 *
 * The result is always returned as an inline base64 `ImageContent` plus the
 * path where it was also written to disk (when writable).
 */

import type { ImageContent } from "@earendil-works/pi-ai";
import { resolve as resolvePath } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { ImgifyConfig } from "./config";

export interface GeneratedImage {
  content: ImageContent;
  /** Filesystem path of the saved copy, if it could be written. */
  path?: string;
}

/** Wrap text, save a PNG copy, and return inline base64 image content. */
async function saveAndWrap(
  png: Buffer,
  config: ImgifyConfig,
  baseName: string,
): Promise<GeneratedImage> {
  const content: ImageContent = {
    type: "image",
    data: png.toString("base64"),
    mimeType: "image/png",
  };

  try {
    await mkdir(config.outputDir, { recursive: true });
    const path = resolvePath(config.outputDir, `${baseName}-${Date.now()}.png`);
    await writeFile(path, png);
    return { content, path };
  } catch {
    // Saving to disk is best-effort; the inline image is what matters.
    return { content };
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
  // Index system fonts so family names resolve when used in ctx.font.
  GlobalFonts.loadSystemFonts();
  const families = GlobalFonts.getFamilies();
  const preferred =
    families.find((f) => /noto sans|dejavu|liberation|arial|sans/i.test(f)) ??
    families[0];
  return preferred ?? "sans-serif";
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
