/**
 * imgify — pi extension
 *
 * Converts a written prompt/message into an image and sends that image to the
 * chat model (which must be vision-capable to actually "see" it).
 *
 * Three ways to use it:
 *
 *  1. Prefix trigger (input transform). With the default config, typing a
 *     message that starts with "@img " converts the rest of the line into an
 *     image and attaches it to the message before the agent sees it:
 *
 *         @img Draw a cat wearing a hat
 *
 *     Set IMAGIFY_TRIGGER=always to convert every message.
 *
 *  2. Slash command. Explicitly convert a prompt and send it:
 *
 *         /imgify Explain this diagram
 *
 *  3. Tool. The LLM can call `imgify` to generate an image from a prompt and
 *     then reason about the returned image itself.
 *
 * Modes: the prompt is always rendered locally onto a PNG (no AI image model,
 * no API key). Configure colors/size via IMAGIFY_RENDER_* env vars.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { loadConfig, type ImgifyConfig } from "./config";
import { generateImage } from "./image-gen";

export default function (pi: ExtensionAPI) {
  // Config is session-scoped; reload on each session start so cwd/env updates apply.
  let config: ImgifyConfig = loadConfig(process.cwd());

  pi.on("session_start", (_event, ctx) => {
    config = loadConfig(ctx.cwd);
  });

  const visionWarning = (ctx: {
    model?: { input: ("text" | "image")[] } | undefined;
    ui: { notify: (m: string, t?: "info" | "warning" | "error") => void };
  }) => {
    const supportsVision = ctx.model?.input.includes("image");
    if (!supportsVision) {
      ctx.ui.notify(
        "imgify: active model may not support images — the image is attached anyway.",
        "warning",
      );
    }
  };

  // 1) Input transform: convert the prompt into an image and attach it to the
  //    message that gets sent to the chat model.
  pi.on("input", async (event, ctx) => {
    // Don't re-process messages we ourselves inject.
    if (event.source === "extension") return { action: "continue" };

    const triggered =
      config.trigger === "always" || event.text.startsWith(config.prefix);
    if (!triggered) return { action: "continue" };

    const prompt =
      config.trigger === "always"
        ? event.text
        : event.text.slice(config.prefix.length).trim();

    if (!prompt) {
      ctx.ui.notify(`imgify: nothing to convert after "${config.prefix}"`, "warning");
      return { action: "handled" };
    }

    visionWarning(ctx);

    try {
      const { content } = await generateImage(prompt, config, ctx.signal);
      return {
        action: "transform",
        text: `Here is an image generated from your prompt: "${prompt}"`,
        images: [content],
      };
    } catch (err) {
      ctx.ui.notify(`imgify failed: ${(err as Error).message}`, "error");
      // Fall back to sending the plain text so the user isn't blocked.
      return { action: "continue" };
    }
  });

  // 2) Slash command: convert a prompt and send the image to the chat model.
  pi.registerCommand(config.command, {
    description:
      "Convert a prompt into an image and send it to the chat model",
    handler: async (args, ctx) => {
      const prompt = args.trim();
      if (!prompt) {
        ctx.ui.notify(`Usage: /${config.command} <prompt>`, "warning");
        return;
      }
      if (!ctx.isIdle()) {
        ctx.ui.notify("Agent is busy — wait for it to finish.", "warning");
        return;
      }

      visionWarning(ctx);

      try {
        ctx.ui.setStatus("imgify", "Generating image…");
        const { content, path } = await generateImage(prompt, config, ctx.signal);
        ctx.ui.setStatus("imgify", undefined);
        if (path) ctx.ui.notify(`Image saved to ${path}`, "info");

        pi.sendUserMessage([
          {
            type: "text",
            text: `Here is an image generated from your prompt: "${prompt}"`,
          },
          content,
        ]);
      } catch (err) {
        ctx.ui.setStatus("imgify", undefined);
        ctx.ui.notify(`imgify failed: ${(err as Error).message}`, "error");
      }
    },
  });

  // 3) Tool: let the LLM generate an image and reason about it.
  pi.registerTool({
    name: "imgify",
    label: "Imgify",
    description:
      "Convert a text prompt into an image and return it so the model can see and reason about it.",
    promptSnippet: "Generate an image from a text prompt",
    promptGuidelines: [
      "Use imgify to turn a user's written prompt into an image and then reason about that image.",
    ],
    parameters: Type.Object({
      prompt: Type.String({
        description: "The prompt or text to convert into an image",
      }),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const { content, path } = await generateImage(params.prompt, config, signal);
      return {
        content: [
          {
            type: "text",
            text:
              `Generated an image from prompt: "${params.prompt}"` +
              (path ? `\nSaved to: ${path}` : ""),
          },
          content,
        ],
        details: { path: path ?? null, mimeType: content.mimeType },
      };
    },
  });
}
