/**
 * imgify — OpenCode plugin
 *
 * Converts a written prompt/message into an image and sends that image to the
 * chat model (which must be vision-capable to actually "see" it).
 *
 * Two ways to use it:
 *
 *  1. Prefix trigger (input transform). With the default config, typing a
 *     message that starts with "imgify " converts the rest of the line into
 *     an image and attaches it to the message before the agent sees it:
 *
 *         imgify Draw a cat wearing a hat
 *
 *     Set IMAGIFY_TRIGGER=always to convert every message.
 *
 *  2. Tool. The LLM can call `imgify` to generate an image from a prompt and
 *     then reason about the returned image itself.
 *
 * Modes: the prompt is always rendered locally onto a PNG (no AI image model,
 * no API key). Configure colors/size via IMAGIFY_RENDER_* env vars.
 */

import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import { loadConfig, type ImgifyConfig } from "./config.js";
import { generateImage } from "./image-gen.js";

/**
 * Convert a Buffer to a base64 data URL string.
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Create the imgify OpenCode plugin.
 */
export const ImgifyPlugin: Plugin = async ({ directory }) => {
  // Load config at plugin initialization
  const config: ImgifyConfig = loadConfig(directory);

  return {
    // Register the imgify tool for the LLM
    tool: {
      imgify: tool({
        description:
          "Convert a text prompt into an image and return it so the model can see and reason about it.",
        args: {
          prompt: tool.schema
            .string()
            .describe("The prompt or text to convert into an image"),
        },
        async execute(args, context) {
          try {
            const { buffer, path } = await generateImage(
              args.prompt,
              config,
              context.abort,
            );

            context.metadata({
              title: `Generated image from: "${args.prompt}"`,
            });

            return {
              output: `Generated an image from prompt: "${args.prompt}"${path ? `\nSaved to: ${path}` : ""}`,
              attachments: [
                {
                  type: "file",
                  mime: "image/png",
                  url: bufferToDataUrl(buffer, "image/png"),
                  filename: `imgify-${Date.now()}.png`,
                },
              ],
            };
          } catch (err) {
            return `imgify failed: ${(err as Error).message}`;
          }
        },
      }),
    },

    // Handle prefix-triggered messages
    "chat.message": async (input, output) => {
      // Find the text part to check for prefix trigger
      const textPart = output.parts.find((p): p is Extract<typeof p, { type: "text" }> => p.type === "text");
      if (!textPart) return;

      const content = textPart.text;
      const triggered =
        config.trigger === "always" || content.startsWith(config.prefix);
      if (!triggered) return;

      const prompt =
        config.trigger === "always"
          ? content
          : content.slice(config.prefix.length).trim();

      if (!prompt) return;

      try {
        const { buffer, path } = await generateImage(prompt, config);

        // Replace the text content with a description
        textPart.text = `Here is an image generated from your prompt: "${prompt}"${path ? `\nSaved to: ${path}` : ""}`;

        // Add the image as a FilePart
        output.parts.push({
          id: `imgify-${Date.now()}`,
          sessionID: input.sessionID,
          messageID: input.messageID ?? output.message.id,
          type: "file",
          mime: "image/png",
          filename: `imgify-${Date.now()}.png`,
          url: bufferToDataUrl(buffer, "image/png"),
        } as any);
      } catch (err) {
        console.error(`imgify failed: ${(err as Error).message}`);
        // Fall through with original content on error
      }
    },
  };
};

export const server = ImgifyPlugin;
export default ImgifyPlugin;

// Also export as a named export for compatibility
export { ImgifyPlugin as plugin };
