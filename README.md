# imgify

Convert a written message/prompt into an image, then send that image to a
chat model.

This repo holds separate plugin implementations per tool:

| Folder | Status | Purpose |
|--------|--------|---------|
| [`pi/`](./pi) | **implemented** | pi coding-agent extension |
| [`opencode/`](./opencode) | placeholder | opencode plugin (not built yet) |

## How it works

1. The user writes a prompt (via a trigger prefix, a slash command, or a tool call).
2. The plugin turns that text into an image by rendering it onto a local PNG
   (via `@napi-rs/canvas`) — no AI image model and no API key required.
3. The image is attached to the message and sent to the chat model, which must be vision-capable to see it.

## Configuration

Both plugins read the same `IMAGIFY_*` environment variables. See
[`pi/README.md`](./pi/README.md) for the full list.

## Install

The pi plugin is published as **`imgify-pi`** on npm. Install it with:

```bash
pi install npm:imgify-pi
```
