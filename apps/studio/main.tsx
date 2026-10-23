import { createRoot } from "react-dom/client";
import {
  EditorStore,
  RecoveryRepository,
  Studio,
  emptyProject,
} from "@spatialdeck/editor";
import type { Player } from "@spatialdeck/player";
import "@spatialdeck/player/fonts.css";
const store = new EditorStore(emptyProject()),
  repository = new RecoveryRepository();
// Embedding/debug API, like the vanilla playground; no second document model.
// Production exposes it only on explicit request: `?studio-debug` in the URL.
const studio = {
  store,
  repository,
  preview: null as Player | null,
  presentation: null as Player | null,
};
declare global {
  interface Window {
    studio?: typeof studio;
  }
}
if (
  import.meta.env.DEV ||
  new URLSearchParams(location.search).has("studio-debug")
)
  window.studio = studio;
createRoot(document.getElementById("root")!).render(
  <Studio
    store={store}
    repository={repository}
    onPlayer={(player, present) => {
      if (present) studio.presentation = player;
      else studio.preview = player;
    }}
  />,
);
