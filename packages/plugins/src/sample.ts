import type { JsonValue } from "@spatialdeck/core";
import type { ContentContext, ContentRenderer } from "@spatialdeck/player";
import type { PluginDefinition, PluginInspector } from "./sdk/index.js";
const valid = (value: JsonValue) =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length === 1 &&
  typeof value.label === "string" &&
  value.label.length <= 2000;
export function samplePlugin(): PluginDefinition {
  return {
    descriptor: {
      id: "org.spatialdeck.badge",
      version: "1.0.0",
      apiVersion: "1.0.0",
      capabilities: { offline: true, capture: false },
      dataSchemas: {
        "1.0.0": {
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["label"],
            properties: { label: { type: "string", maxLength: 2000 } },
          },
          validate: valid,
        },
      },
    },
    renderer: (): ContentRenderer => {
      let host: HTMLElement, off: (() => void) | undefined;
      function update(context: ContentContext) {
        if (context.block.type !== "plugin") return;
        host.textContent = String(
          (context.block.data.payload as { label: string }).label,
        );
        host.classList.add("sd-plugin-badge");
      }
      return {
        mount(element, context) {
          host = element;
          update(context);
          off = context.services.on("cue", ({ cue }) =>
            context.services.emit("org.spatialdeck.badge:cue", cue.payload),
          );
        },
        update,
        destroy() {
          off?.();
          host.classList.remove("sd-plugin-badge");
          host.replaceChildren();
        },
      };
    },
  };
}
/** Editor entrypoint has no React dependency; edits are committed by the host store. */
export const sampleInspector: PluginInspector = {
  pluginId: "org.spatialdeck.badge",
  label: "Badge locale",
  fields: ["label"],
  edit(payload, field, value) {
    if (field !== "label" || !valid(payload))
      throw new Error("Invalid badge data");
    return { label: value };
  },
};
