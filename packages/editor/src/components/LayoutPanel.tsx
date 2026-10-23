import { useEffect, useState } from "react";
import {
  alignFrames,
  contrastIssues,
  distributeFrames,
  failure,
  framesIntersect,
  stackFrames,
} from "@spatialdeck/core";
import type {
  Alignment,
  BlockStyle,
  Frame,
  ProjectDocument,
  Result,
  Scene,
  StackOrder,
} from "@spatialdeck/core";
import {
  convertToCanvas,
  moveInReadingOrder,
  setAppearance,
  setBlockStyle,
  setFrames,
} from "../commands/index.js";
import type { EditorStore } from "../store/index.js";
import { Numeric } from "./Inspector.js";
import { blockElement, measureFlowFrames } from "./LayoutEditor.js";

/** Italian text for the layout diagnostics a field can produce. */
function layoutResult(result: Result<void>): Result<void> {
  if (result.ok) return result;
  const d = result.diagnostics[0];
  if (d?.code === "FRAME_OUTSIDE")
    return failure(d.code, "Il frame deve restare dentro la scena.", d.pointer);
  if (d?.code === "SCHEMA_INVALID")
    return failure(
      d.code,
      "Valore fuori intervallo: larghezza e altezza almeno 8, rotazione tra −360 e 360, livello intero tra −1000 e 1000.",
      d.pointer,
    );
  return result;
}
const interactive =
  'a[href],button,input,select,textarea,iframe,audio[controls],video[controls],[tabindex]:not([tabindex="-1"])';
/** Contrast from the core; clipped text and covered controls measured on the shared preview. */
export function layoutDiagnostics(
  document: ProjectDocument,
  scene: Scene,
  host: HTMLElement | null,
): string[] {
  const sceneIndex = document.scenes.indexOf(scene);
  const warnings: string[] = [];
  for (const issue of contrastIssues(document)) {
    const where = issue.pointer.startsWith(`/scenes/${sceneIndex}/blocks/`)
      ? `blocco ${Number(issue.pointer.split("/")[4]) + 1}`
      : issue.pointer === `/scenes/${sceneIndex}/appearance`
        ? "sfondo della scena"
        : issue.pointer === "/theme/colors/text"
          ? "testo del tema sullo sfondo"
          : issue.pointer === "/theme/colors/accent"
            ? "accento sul fondale"
            : null;
    if (where)
      warnings.push(
        `Contrasto ${issue.ratio.toFixed(2)}:1, sotto ${issue.minimum}:1 (${issue.kind === "text" ? "testo" : "componenti"}): ${where}.`,
      );
  }
  scene.blocks.forEach((block, i) => {
    const element = blockElement(host, scene.id, block.id);
    if (
      block.frame &&
      element &&
      (element.scrollHeight > element.clientHeight + 1 ||
        element.scrollWidth > element.clientWidth + 1)
    )
      warnings.push(
        `Contenuto tagliato: il blocco ${i + 1} eccede il proprio frame.`,
      );
  });
  scene.blocks.forEach((below, i) => {
    if (
      !below.frame ||
      !blockElement(host, scene.id, below.id)?.querySelector(interactive)
    )
      return;
    scene.blocks.forEach((above, j) => {
      if (
        above.frame &&
        j !== i &&
        (above.frame.z > below.frame!.z ||
          (above.frame.z === below.frame!.z && j > i)) &&
        framesIntersect(above.frame, below.frame!)
      )
        warnings.push(
          `Sovrapposizione: il blocco ${j + 1} copre i controlli interattivi del blocco ${i + 1}.`,
        );
    });
  });
  return warnings;
}
const styleOptions: Record<keyof BlockStyle, Array<[string, string]>> = {
  align: [
    ["start", "Inizio"],
    ["center", "Centro"],
    ["end", "Fine"],
    ["justify", "Giustificato"],
  ],
  verticalAlign: [
    ["start", "In alto"],
    ["center", "Al centro"],
    ["end", "In basso"],
  ],
  size: [
    ["xs", "XS"],
    ["s", "S"],
    ["m", "M"],
    ["l", "L"],
    ["xl", "XL"],
    ["xxl", "XXL"],
  ],
  color: [],
};
const styleLabels: Record<keyof BlockStyle, string> = {
  align: "Allineamento testo",
  verticalAlign: "Allineamento verticale",
  size: "Dimensione testo",
  color: "Colore testo",
};
export function LayoutPanel({
  store,
  document,
  scene,
  host,
  revision,
  selection,
  onSelect,
  grid,
  onGrid,
  announcement,
  announce,
  onFlow,
}: {
  store: EditorStore;
  document: ProjectDocument;
  scene: Scene;
  host: HTMLElement | null;
  revision: number;
  selection: readonly string[];
  onSelect: (ids: string[]) => void;
  grid: number;
  onGrid: (grid: number) => void;
  announcement: string;
  announce: (text: string) => void;
  /** Asks for confirmation before frames are removed. */
  onFlow: () => void;
}) {
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const canvas = scene.layout === "canvas";
  const chosen = scene.blocks.filter((b) => selection.includes(b.id));
  const single = chosen.length === 1 ? chosen[0] : undefined;
  useEffect(() => {
    const update = () => {
      // Measured after the gesture, not on every pointer move.
      if (store.getSnapshot().dragging) return;
      const next = layoutDiagnostics(document, scene, host);
      setWarnings((previous) =>
        previous.join("\n") === next.join("\n") ? previous : next,
      );
    };
    update();
    // Clipping depends on font metrics: measure again when theme fonts arrive.
    window.document.fonts?.addEventListener?.("loadingdone", update);
    return () =>
      window.document.fonts?.removeEventListener?.("loadingdone", update);
  }, [store, document, scene, host, revision]);
  const report = (result: Result<void>) => {
    const r = layoutResult(result);
    setError(r.ok ? "" : (r.diagnostics[0]?.message ?? "Modifica rifiutata."));
    return r;
  };
  const frames = (patch: Record<string, Frame>, message: string) => {
    const r = report(store.execute(setFrames(scene.id, patch)));
    if (r.ok) announce(message);
  };
  const framed = chosen.filter((b) => b.frame);
  function align(alignment: Alignment, label: string) {
    const result = alignFrames(
      framed.map((b) => b.frame!),
      alignment,
      scene.size,
    );
    frames(
      Object.fromEntries(framed.map((b, i) => [b.id, result[i]!])),
      `Allineati: ${label}.`,
    );
  }
  function distribute(axis: "horizontal" | "vertical") {
    const result = distributeFrames(
      framed.map((b) => b.frame!),
      axis,
      scene.size,
    );
    frames(
      Object.fromEntries(framed.map((b, i) => [b.id, result[i]!])),
      axis === "horizontal"
        ? "Distribuiti in orizzontale."
        : "Distribuiti in verticale.",
    );
  }
  function stack(order: StackOrder, label: string) {
    const all = scene.blocks.filter((b) => b.frame);
    const selected = new Set(
      all.flatMap((b, i) => (selection.includes(b.id) ? [i] : [])),
    );
    const z = stackFrames(
      all.map((b) => b.frame!),
      selected,
      order,
    );
    frames(
      Object.fromEntries(
        all.flatMap((b, i) =>
          selected.has(i) ? [[b.id, { ...b.frame!, z: z[i]! }]] : [],
        ),
      ),
      label,
    );
  }
  function frameField(field: keyof Frame, label: string) {
    if (!single?.frame) return null;
    const frame = single.frame;
    return (
      <Numeric
        key={`${single.id}-${field}`}
        label={label}
        value={frame[field]}
        apply={(value) =>
          layoutResult(
            store.execute(
              setFrames(scene.id, {
                [single.id]: { ...frame, [field]: value },
              }),
            ),
          )
        }
      />
    );
  }
  const palette = document.theme.palette;
  const common = (key: keyof BlockStyle) => {
    const values = new Set(chosen.map((b) => b.style?.[key] ?? ""));
    return values.size === 1 ? [...values][0]! : "mixed";
  };
  return (
    <section className="layout-panel" aria-labelledby="layout-panel-title">
      <h2 id="layout-panel-title">
        Impaginazione <span>{canvas ? "CANVAS" : "FLOW"}</span>
      </h2>
      <p className="layout-live" role="status" aria-live="polite">
        {announcement}
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="layout-actions">
        {canvas ? (
          <button type="button" tabIndex={0} onClick={onFlow}>
            Torna a flow
          </button>
        ) : (
          <button
            type="button"
            tabIndex={0}
            className="primary"
            onClick={() => {
              const measured = measureFlowFrames(host, document, scene);
              if (!measured) {
                setError(
                  "Anteprima non pronta: attendi che la scena sia visibile e riprova.",
                );
                return;
              }
              const r = report(
                store.execute(convertToCanvas(scene.id, measured)),
              );
              if (r.ok)
                announce(
                  `Scena convertita in canvas: ${scene.blocks.length} frame creati.`,
                );
            }}
          >
            Converti in canvas
          </button>
        )}
        <button
          type="button"
          tabIndex={0}
          disabled={!scene.blocks.length}
          onClick={() => {
            onSelect(scene.blocks.map((b) => b.id));
            announce(`Selezionati ${scene.blocks.length} blocchi.`);
          }}
        >
          Seleziona tutti
        </button>
        <button
          type="button"
          tabIndex={0}
          disabled={!selection.length}
          onClick={() => onSelect([])}
        >
          Deseleziona
        </button>
      </div>
      {canvas && (
        <fieldset>
          <legend>
            Frame{" "}
            <span>
              {single
                ? `blocco ${scene.blocks.indexOf(single) + 1}`
                : chosen.length
                  ? `${chosen.length} selezionati`
                  : "nessuna selezione"}
            </span>
          </legend>
          {single?.frame && (
            <div className="numeric-row layout-numbers">
              {frameField("x", "X frame")}
              {frameField("y", "Y frame")}
              {frameField("width", "Larghezza frame")}
              {frameField("height", "Altezza frame")}
              {frameField("rotation", "Rotazione frame")}
              {frameField("z", "Livello z")}
            </div>
          )}
          <div className="layout-buttons" aria-label="Allinea">
            {(
              [
                ["left", "A sinistra"],
                ["center", "Al centro orizzontale"],
                ["right", "A destra"],
                ["top", "In alto"],
                ["middle", "Al centro verticale"],
                ["bottom", "In basso"],
              ] as const
            ).map(([alignment, label]) => (
              <button
                key={alignment}
                type="button"
                tabIndex={0}
                disabled={!framed.length}
                onClick={() => align(alignment, label.toLowerCase())}
              >
                Allinea {label.toLowerCase()}
              </button>
            ))}
            <button
              type="button"
              tabIndex={0}
              disabled={framed.length < 3}
              onClick={() => distribute("horizontal")}
            >
              Distribuisci in orizzontale
            </button>
            <button
              type="button"
              tabIndex={0}
              disabled={framed.length < 3}
              onClick={() => distribute("vertical")}
            >
              Distribuisci in verticale
            </button>
          </div>
          <div className="layout-buttons" aria-label="Livelli">
            {(
              [
                ["forward", "Porta avanti"],
                ["backward", "Porta indietro"],
                ["front", "In primo piano"],
                ["back", "In fondo"],
              ] as const
            ).map(([order, label]) => (
              <button
                key={order}
                type="button"
                tabIndex={0}
                disabled={!framed.length}
                onClick={() => stack(order, `${label}: livello aggiornato.`)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="layout-check">
            <input
              type="checkbox"
              checked={grid > 0}
              onChange={(e) => onGrid(e.target.checked ? 16 : 0)}
            />
            Griglia magnetica
          </label>
          {grid > 0 && (
            <label>
              Passo griglia
              <select
                aria-label="Passo griglia"
                value={grid}
                onChange={(e) => onGrid(Number(e.target.value))}
              >
                {[8, 16, 32, 64].map((n) => (
                  <option key={n} value={n}>
                    {n} px
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
      )}
      <fieldset>
        <legend>Aspetto della scena</legend>
        <label>
          Variante
          <select
            aria-label="Variante della scena"
            value={scene.appearance.variant}
            onChange={(e) =>
              report(
                store.execute(
                  setAppearance(scene.id, {
                    variant: e.target.value as "card" | "plain",
                  }),
                ),
              )
            }
          >
            <option value="card">Card con bordo</option>
            <option value="plain">Semplice, senza bordo</option>
          </select>
        </label>
        <label>
          Sfondo
          <select
            aria-label="Sfondo della scena"
            value={scene.appearance.background ?? ""}
            onChange={(e) =>
              report(
                store.execute(
                  setAppearance(scene.id, {
                    background: e.target.value || null,
                  }),
                ),
              )
            }
          >
            <option value="">Predefinito della variante</option>
            {palette.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} ({p.value})
              </option>
            ))}
          </select>
        </label>
        <label className="layout-check">
          <input
            type="checkbox"
            checked={scene.appearance.titleVisible}
            onChange={(e) =>
              report(
                store.execute(
                  setAppearance(scene.id, { titleVisible: e.target.checked }),
                ),
              )
            }
          />
          Titolo visibile (resta comunque nome accessibile e vista testuale)
        </label>
      </fieldset>
      <fieldset>
        <legend>
          Stile del blocco{" "}
          <span>{chosen.length ? `${chosen.length} selezionati` : "—"}</span>
        </legend>
        {(Object.keys(styleLabels) as Array<keyof BlockStyle>).map((key) => {
          const options =
            key === "color"
              ? palette.map(
                  (p) => [p.id, `${p.id} (${p.value})`] as [string, string],
                )
              : styleOptions[key];
          const value = chosen.length ? common(key) : "";
          return (
            <label key={key}>
              {styleLabels[key]}
              <select
                aria-label={styleLabels[key]}
                disabled={!chosen.length}
                value={value}
                onChange={(e) => {
                  const r = report(
                    store.execute(
                      setBlockStyle(
                        scene.id,
                        chosen.map((b) => b.id),
                        { [key]: e.target.value || undefined },
                      ),
                    ),
                  );
                  if (r.ok) announce(`${styleLabels[key]} aggiornato.`);
                }}
              >
                {value === "mixed" && (
                  <option value="mixed" disabled>
                    Valori diversi
                  </option>
                )}
                <option value="">Predefinito</option>
                {options.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </fieldset>
      <fieldset className="reading-order">
        <legend>
          Ordine di lettura <span>DOM, Tab e vista testuale</span>
        </legend>
        <p className="layout-hint">
          L’ordine dell’elenco è l’ordine di lettura e di tabulazione; il
          livello z cambia soltanto la sovrapposizione visiva.
        </p>
        <ol aria-label="Ordine di lettura">
          {scene.blocks.map((block, i) => (
            <li key={block.id}>
              <button
                type="button"
                tabIndex={0}
                aria-pressed={selection.includes(block.id)}
                onClick={(e) => {
                  const additive = e.shiftKey;
                  onSelect(
                    additive
                      ? selection.includes(block.id)
                        ? selection.filter((id) => id !== block.id)
                        : [...selection, block.id]
                      : [block.id],
                  );
                }}
              >
                {i + 1}. {block.type}
                {block.frame ? ` · z ${block.frame.z}` : ""}
              </button>
              <button
                type="button"
                tabIndex={0}
                aria-label={`Anticipa nella lettura il blocco ${i + 1}`}
                disabled={i === 0}
                onClick={() => {
                  const r = report(
                    store.execute(moveInReadingOrder(scene.id, block.id, -1)),
                  );
                  if (r.ok) announce(`Blocco ora in posizione ${i}.`);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                tabIndex={0}
                aria-label={`Posticipa nella lettura il blocco ${i + 1}`}
                disabled={i === scene.blocks.length - 1}
                onClick={() => {
                  const r = report(
                    store.execute(moveInReadingOrder(scene.id, block.id, 1)),
                  );
                  if (r.ok) announce(`Blocco ora in posizione ${i + 2}.`);
                }}
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
      </fieldset>
      <section
        className="layout-diagnostics"
        aria-labelledby="layout-diagnostics-title"
      >
        <h3 id="layout-diagnostics-title">
          Diagnostica <span>{warnings.length}</span>
        </h3>
        {warnings.length ? (
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p>Nessun problema rilevato nella scena.</p>
        )}
      </section>
    </section>
  );
}
