# imgify (pi extension)

Convert a written prompt/message into an image and send that image to the
chat model. The chat model must be **vision-capable** (`image` in its input
types) to actually "see" the image.

The image is generated **locally** — the prompt text is rendered onto a PNG
with no AI image model and no API key. (The only AI model in the loop is the
chat model that receives the image.)

## Install

**As a published pi package (recommended):**

```bash
pi install npm:imgify-pi
```

**From this repo (local development):**

```bash
cd pi
npm install          # pulls @napi-rs/canvas for local text rendering

# register it as a project-local package (writes .pi/settings.json -> packages)
pi install ./pi -l
```

This repo's `.pi/settings.json` already lists `../pi` under `packages`, so
running `pi` in the repo root loads the extension automatically (after the
project is trusted). After editing, run `/reload` (or restart pi) to pick up
changes.

Alternative manual methods (also work):

```bash
# symlink/copy into the auto-discovered project-local extensions dir
ln -sfn ../../pi .pi/extensions/imgify
cp -r pi .pi/extensions/imgify

# or run it ad-hoc for one session
pi -e ./pi/index.ts
```

## Usage

Three entry points:

1. **Prefix trigger** (input transform). With the default config, a message
   starting with `imgify ` is converted and the image is attached to the message
   before the agent sees it:

   ```
   imgify Draw a cat wearing a hat
   ```

   > Note: the trigger uses no `@` because pi reserves `@<path>` for attaching
   > files. Set `IMAGIFY_TRIGGER=always` to convert *every* message.

2. **Slash command**:

   ```
   /imgify Explain this diagram
   ```

3. **Tool** — the LLM can call `imgify` to generate an image and reason about it.

## Configuration (environment variables)

| Variable | Default | Meaning |
|----------|---------|---------|
| `IMAGIFY_TRIGGER` | `prefix` | `prefix` or `always` |
| `IMAGIFY_PREFIX` | `imgify ` | Trigger prefix in `prefix` mode |
| `IMAGIFY_COMMAND` | `imgify` | Slash command name |
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

- `index.ts` — extension entry (input transform, command, tool)
- `image-gen.ts` — local text rendering
- `config.ts` — environment-based configuration
