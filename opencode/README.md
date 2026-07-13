# imgify (opencode plugin)

> **Not implemented yet.** This folder is a placeholder for the opencode
> version of imgify. The pi version lives in `../pi` and is fully implemented.

## Planned behavior

Mirror the pi plugin: convert a written prompt/message into an image and send
that image to the chat model.

opencode plugins are TypeScript modules that register tools/commands via the
opencode extension API (different surface than pi's `ExtensionAPI`). The image
generation core (`render` + `openai` modes) from `../pi/image-gen.ts` can be
reused almost verbatim since it only depends on `@napi-rs/canvas` and `fetch`.

See `../pi/README.md` for the shared configuration and modes.

## When implementing

- A command (e.g. `/imgify <prompt>`) and/or a tool the model can call.
- Reuse `../pi/image-gen.ts` for image generation.
- Attach the resulting base64 image to the user message sent to the model.
