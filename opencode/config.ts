/**
 * imgify — configuration
 *
 * Reads config from environment variables so the plugin can be tuned without
 * editing code. All values fall back to sensible defaults.
 *
 * Image generation is done locally (the prompt text is rendered onto a PNG via
 * @napi-rs/canvas) — no AI image model and no API key required.
 */

export type ImgifyTrigger = "prefix" | "always";

export interface ImgifyConfig {
  /** When to convert. "prefix" only converts messages starting with `prefix`. */
  trigger: ImgifyTrigger;
  /** Prefix that triggers conversion in "prefix" mode. */
  prefix: string;
  /** Directory where generated images are also written to disk. */
  outputDir: string;
  /** Options for local text rendering. */
  render: {
    background: string;
    foreground: string;
    fontSize: number;
    padding: number;
    maxWidth: number;
    /** Optional explicit font family; auto-detected if omitted. */
    fontFamily?: string;
  };
}

export function loadConfig(cwd: string): ImgifyConfig {
  const env = process.env;

  return {
    trigger: (env.IMAGIFY_TRIGGER ?? "prefix") as ImgifyTrigger,
    prefix: env.IMAGIFY_PREFIX ?? "imgify ",
    outputDir: env.IMAGIFY_OUTPUT_DIR
      ? env.IMAGIFY_OUTPUT_DIR
      : `${cwd}/.imgify`,

    render: {
      background: env.IMAGIFY_RENDER_BG ?? "#0d1117",
      foreground: env.IMAGIFY_RENDER_FG ?? "#e6edf3",
      fontSize: env.IMAGIFY_RENDER_FONT_SIZE
        ? Number(env.IMAGIFY_RENDER_FONT_SIZE)
        : 36,
      padding: env.IMAGIFY_RENDER_PADDING
        ? Number(env.IMAGIFY_RENDER_PADDING)
        : 40,
      maxWidth: env.IMAGIFY_RENDER_MAX_WIDTH
        ? Number(env.IMAGIFY_RENDER_MAX_WIDTH)
        : 900,
      fontFamily: env.IMAGIFY_RENDER_FONT_FAMILY || undefined,
    },
  };
}
