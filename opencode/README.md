# imgify (OpenCode plugin)

Convert a written prompt/message into an image and send that image to the
chat model. The chat model must be **vision-capable** to actually "see" the
image.

The image is generated **locally** — the prompt text is rendered onto a PNG
with no AI image model and no API key. (The only AI model in the loop is the
chat model that receives the image.)

## Install

**As a published npm package (recommended):**

```bash
opencode plugin imgify-opencode
```

**From this repo (local development):**

```bash
cd opencode
bun install          # pulls @napi-rs/canvas for local text rendering
bun run build        # builds the plugin
```

Then install it:

```bash
opencode plugin ./opencode
```

The plugin will be symlinked into `.opencode/opencode` and configured in `.opencode/opencode.json`.

## Usage

Two entry points:

1. **Prefix trigger** (input transform). With the default config, a message
   starting with `imgify ` is converted and the image is attached to the
   message before the agent sees it:

   ```
   imgify Draw a cat wearing a hat
   ```

   > Note: Set `IMAGIFY_TRIGGER=always` to convert *every* message.

2. **Tool** — the LLM can call `imgify` to generate an image and reason about it.

## Configuration (environment variables)

| Variable | Default | Meaning |
|----------|---------|---------|
| `IMAGIFY_TRIGGER` | `prefix` | `prefix` or `always` |
| `IMAGIFY_PREFIX` | `imgify ` | Trigger prefix in `prefix` mode |
| `IMAGIFY_OUTPUT_DIR` | `<cwd>/.imgify` | Where generated PNGs are also saved |
| `IMAGIFY_RENDER_BG` | `#0d1117` | Render background color |
| `IMAGIFY_RENDER_FG` | `#e6edf3` | Render text color |
| `IMAGIFY_RENDER_FONT_SIZE` | `36` | Render font size (px) |
| `IMAGIFY_RENDER_PADDING` | `40` | Render padding (px) |
| `IMAGIFY_RENDER_MAX_WIDTH` | `900` | Render canvas width (px) |
| `IMAGIFY_RENDER_FONT_FAMILY` | _auto_ | Explicit font family (else auto-detected) |

## How images are generated

The prompt text is rendered onto a PNG locally using
[`@napi-rs/canvas`](https://www.npmjs.com/package/@napi-rs/canvas). No AI image
model and no API key are required. A system font is auto-detected via
fontconfig. The resulting image literally contains the prompt text, which a
vision chat model can then read back.

## Files

- `index.ts` — plugin entry (tool + chat.message hook)
- `image-gen.ts` — local text rendering
- `config.ts` — environment-based configuration
