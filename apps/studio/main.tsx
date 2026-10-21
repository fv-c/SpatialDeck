import { createRoot } from "react-dom/client";
import {
  EditorStore,
  RecoveryRepository,
  Studio,
  emptyProject,
} from "@spatialdeck/editor";
import type { Player } from "@spatialdeck/player";
const store = new EditorStore(emptyProject()),
  repository = new RecoveryRepository();
// Explicit embedding/debug API, like the vanilla playground; no second document model.
const studio = {
  store,
  repository,
  preview: null as Player | null,
  presentation: null as Player | null,
};
declare global {
  interface Window {
    studio: typeof studio;
  }
}
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
