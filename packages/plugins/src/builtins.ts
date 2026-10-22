import { RendererRegistry } from "@spatialdeck/player";
import { registerRich } from "./rich.js";
import { registerMedia } from "./media.js";
import { registerNavigation } from "./navigation.js";
import { PluginHost } from "./sdk/index.js";
import { samplePlugin } from "./sample.js";
export function createBuiltinRegistry() {
  const registry = new RendererRegistry(),
    plugins = new PluginHost();
  registerRich(registry);
  registerMedia(registry);
  registerNavigation(registry);
  plugins.register(samplePlugin());
  plugins.attach(registry);
  return { registry, plugins };
}
