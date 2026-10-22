import { useEffect, useRef } from "react";
import { createPlayer, createAssetResolver } from "@spatialdeck/player";
import type { Player } from "@spatialdeck/player";
import type { AssetBlobs } from "@spatialdeck/player";
import { createBuiltinRegistry } from "@spatialdeck/plugins/builtins";
import {
  sampleTransition,
  resolveSceneCamera,
  cameraPose,
  success,
} from "@spatialdeck/core";
import type { Capture } from "./CameraTimeline.js";
import type { NavigationSelection } from "./PathPanel.js";
import type { ProjectDocument } from "@spatialdeck/core";
export function PlayerSurface({
  document,
  selection,
  present = false,
  onPlayer,
  navigation = null,
  capture = null,
  blobs,
}: {
  document: ProjectDocument;
  selection: string | null;
  present?: boolean;
  navigation?: NavigationSelection | null;
  capture?: Capture | null;
  onPlayer?: (player: Player | null, present: boolean) => void;
  blobs?: AssetBlobs;
}) {
  const host = useRef<HTMLDivElement>(null),
    player = useRef<Player | null>(null);
  const initial = useRef(document),
    callback = useRef(onPlayer);
  callback.current = onPlayer;
  const assets = useRef(
    createAssetResolver(document.assets, blobs ?? new Map()),
  );
  assets.current = createAssetResolver(document.assets, blobs ?? new Map());
  useEffect(() => {
    const builtins = createBuiltinRegistry();
    const instance = createPlayer({
      input: present,
      motion: present ? "system" : "reduced",
      registry: builtins.registry,
      assets: {
        resolve: (id, signal) => assets.current.resolve(id, signal),
        revision: (id) => assets.current.revision?.(id),
      },
      muted: !present,
    });
    player.current = instance;
    void instance.mount(host.current!, initial.current).then((result) => {
      if (!result.ok)
        host.current!.textContent = result.diagnostics
          .map((d) => d.message)
          .join("; ");
    });
    callback.current?.(instance, present);
    return () => {
      callback.current?.(null, present);
      instance.destroy();
      builtins.plugins.destroy();
      player.current = null;
    };
  }, [present]);
  useEffect(() => {
    if (present) return;
    const frame = requestAnimationFrame(() => {
      const instance = player.current;
      if (!instance) return;
      void instance.updateDocument(document).then((result) => {
        if (!result.ok) return;
        const path = document.paths.find(
            (p) => p.id === (navigation?.pathId ?? document.defaultPathId),
          ),
          node = navigation
            ? path?.nodes.find((n) => n.id === navigation.nodeId)
            : path?.nodes.find((n) => n.sceneId === selection);
        if (path && node)
          void instance
            .goTo({ pathId: path.id, nodeId: node.id }, { durationMs: 0 })
            .then(() => {
              const pose = node.camera
                ? success(cameraPose(node.camera))
                : resolveSceneCamera(document, node.sceneId);
              if (pose.ok) instance.setCamera(pose.value);
            });
        else if (selection) {
          const pose = resolveSceneCamera(document, selection);
          if (pose.ok) instance.setCamera(pose.value);
        }
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [document, selection, present, navigation, blobs]);
  useEffect(() => {
    if (!present) {
      if (capture)
        player.current?.setCamera(
          sampleTransition(capture.plan, capture.elapsedMs).camera,
        );
      else player.current?.setView("scene");
    }
  }, [capture, present]);
  return (
    <div
      ref={host}
      className={present ? "presentation-player" : "preview-player"}
      aria-label={present ? "Player presentazione" : "Anteprima player"}
    />
  );
}
