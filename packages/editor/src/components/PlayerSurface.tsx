import { useEffect, useRef } from "react";
import { createPlayer } from "@spatialdeck/player";
import type { Player } from "@spatialdeck/player";
import type { ProjectDocument } from "@spatialdeck/core";
export function PlayerSurface({
  document,
  selection,
  present = false,
  onPlayer,
}: {
  document: ProjectDocument;
  selection: string | null;
  present?: boolean;
  onPlayer?: (player: Player | null, present: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    player = useRef<Player | null>(null);
  const initial = useRef(document),
    callback = useRef(onPlayer);
  callback.current = onPlayer;
  useEffect(() => {
    const instance = createPlayer({
      input: present,
      motion: present ? "system" : "reduced",
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
            (p) => p.id === document.defaultPathId,
          ),
          node = path?.nodes.find((n) => n.sceneId === selection);
        if (path && node)
          void instance.goTo(
            { pathId: path.id, nodeId: node.id },
            { durationMs: 0 },
          );
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [document, selection, present]);
  return (
    <div
      ref={host}
      className={present ? "presentation-player" : "preview-player"}
      aria-label={present ? "Player presentazione" : "Anteprima player"}
    />
  );
}
