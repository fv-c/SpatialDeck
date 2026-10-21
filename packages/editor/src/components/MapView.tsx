import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { sceneMatrix } from "@spatialdeck/core";
import type { EditorSession, EditorStore } from "../store/index.js";
export function MapView({
  store,
  session,
}: {
  store: EditorStore;
  session: EditorSession;
}) {
  const gesture = useRef<{
    pointer: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    scene: boolean;
  } | null>(null);
  const { map, document } = session;
  function down(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || gesture.current) return;
    const id = (event.target as Element)
      .closest("[data-map-scene]")
      ?.getAttribute("data-map-scene");
    const scene = document.scenes.find((s) => s.id === id);
    if (scene) store.beginDrag(scene.id);
    gesture.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: scene?.position[0] ?? map.x,
      y: scene?.position[1] ?? map.y,
      scene: !!scene,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
  }
  function finish(cancel = false) {
    if (!gesture.current) return;
    if (gesture.current.scene) {
      if (cancel) store.cancelDrag();
      else store.endDrag();
    } else if (cancel)
      store.setMap({ ...map, x: gesture.current.x, y: gesture.current.y });
    gesture.current = null;
  }
  return (
    <section className="map-panel" aria-label="Mappa XY">
      <div className="panel-heading">
        <h2>
          Mappa spaziale <span>XY</span>
        </h2>
        <div className="map-tools">
          <button
            tabIndex={0}
            aria-label="Riduci zoom"
            onClick={() =>
              store.setMap({ ...map, zoom: Math.max(0.02, map.zoom / 1.25) })
            }
          >
            −
          </button>
          <output aria-label="Zoom mappa">{Math.round(map.zoom * 100)}%</output>
          <button
            tabIndex={0}
            aria-label="Aumenta zoom"
            onClick={() =>
              store.setMap({ ...map, zoom: Math.min(2, map.zoom * 1.25) })
            }
          >
            +
          </button>
          <button
            tabIndex={0}
            onClick={() => store.setMap({ x: 0, y: 0, zoom: 0.25 })}
          >
            Centra
          </button>
        </div>
      </div>
      <svg
        role="application"
        aria-label="Mappa XY: trascina le scene; trascina lo sfondo per spostare la mappa. Escape annulla."
        tabIndex={0}
        viewBox="-600 -400 1200 800"
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={down}
        onPointerMove={(event) => {
          const g = gesture.current;
          if (!g || g.pointer !== event.pointerId) return;
          const svg = event.currentTarget;
          const matrix = svg.getScreenCTM();
          if (!matrix) return;
          const dx = (event.clientX - g.startX) / matrix.a,
            dy = (event.clientY - g.startY) / matrix.d;
          if (g.scene) store.moveDrag(g.x + dx / map.zoom, g.y + dy / map.zoom);
          else store.setMap({ ...map, x: g.x + dx, y: g.y + dy });
        }}
        onPointerUp={() => finish()}
        onPointerCancel={() => finish(true)}
        onLostPointerCapture={() => finish(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            finish(true);
          } else if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            store.setMap({
              ...map,
              x:
                map.x +
                (event.key === "ArrowLeft"
                  ? 40
                  : event.key === "ArrowRight"
                    ? -40
                    : 0),
              y:
                map.y +
                (event.key === "ArrowUp"
                  ? 40
                  : event.key === "ArrowDown"
                    ? -40
                    : 0),
            });
          }
        }}
        onWheel={(event) => {
          if (event.ctrlKey || event.metaKey) return;
          store.setMap({
            ...map,
            zoom: Math.max(
              0.02,
              Math.min(2, map.zoom * Math.exp(-event.deltaY * 0.001)),
            ),
          });
        }}
      >
        <defs>
          <pattern
            id="map-grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="currentColor"
              strokeWidth=".6"
            />
          </pattern>
        </defs>
        <rect
          x="-600"
          y="-400"
          width="1200"
          height="800"
          fill="url(#map-grid)"
          className="map-grid"
        />
        <g transform={`translate(${map.x} ${map.y}) scale(${map.zoom})`}>
          <path d="M -2400 0 H 2400 M 0 -1600 V 1600" className="map-axis" />
          {document.scenes.map((scene, index) => {
            const m = sceneMatrix(scene);
            return (
              <g
                key={scene.id}
                data-map-scene={scene.id}
                className={`map-scene ${session.selection === scene.id ? "selected" : ""}`}
                transform={`matrix(${m[0]} ${m[1]} ${m[4]} ${m[5]} ${m[12]} ${m[13]})`}
                opacity={scene.visible ? 1 : 0.4}
              >
                <rect
                  x={-scene.size[0] / 2}
                  y={-scene.size[1] / 2}
                  width={scene.size[0]}
                  height={scene.size[1]}
                  rx="12"
                />
                <text
                  x={-scene.size[0] / 2 + 30}
                  y={-scene.size[1] / 2 + 24 / map.zoom}
                  fontSize={19 / map.zoom}
                >
                  {String(index + 1).padStart(2, "0")} ·{" "}
                  {scene.title.slice(0, 30)}
                </text>
                <circle r="9" />
                <title>
                  {scene.title} · X {scene.position[0]}, Y {scene.position[1]},
                  Z {scene.position[2]}
                </title>
              </g>
            );
          })}
        </g>
        {!document.scenes.length && (
          <text x="0" y="0" textAnchor="middle" className="map-empty">
            Crea una scena per iniziare.
          </text>
        )}
      </svg>
      <p className="map-help">
        Trascina per spostare · Rotella per zoom · Escape per annullare ·
        Coordinate precise nell’inspector
      </p>
    </section>
  );
}
