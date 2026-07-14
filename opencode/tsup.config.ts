import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  minify: false,
  target: "node22",
  platform: "node",
  external: ["@opencode-ai/plugin", "@opencode-ai/plugin/tool", "@napi-rs/canvas"],
});
