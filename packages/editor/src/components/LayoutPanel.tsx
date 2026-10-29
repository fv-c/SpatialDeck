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
  Block,
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
import { Icon, IconButton } from "./icons.js";
import type { IconName } from "./icons.js";
import { blockTypes } from "./blockTypes.js";

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
/**
 * Contrast from the core; clipped text, a title over frames, an overflowing
 * flow scene and covered controls measured on the shared preview.
 */
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
  const content = host?.querySelector<HTMLElement>(
    `.sd-scene[data-scene-id="${scene.id}"] .sd-content`,
  );
  // A visible canvas title is laid out above the frames; a long one wraps into them.
  const title = content?.querySelector<HTMLElement>(
    ":scope > h2:not(.sd-title-hidden)",
  );
  if (scene.layout === "canvas" && title) {
    const band = {
      x: title.offsetLeft,
      y: title.offsetTop,
      width: title.offsetWidth,
      height: title.offsetHeight,
      rotation: 0,
      z: 0,
    };
    scene.blocks.forEach((block, i) => {
      if (block.frame && framesIntersect(band, block.frame))
        warnings.push(
          `Titolo: il blocco ${i + 1} occupa la fascia del titolo visibile.`,
        );
    });
  }
  // A flow scene does not grow: what exceeds it scrolls live and is cut in PDF and video.
  if (
    scene.layout === "flow" &&
    content &&
    content.scrollHeight > content.clientHeight + 1
  )
    warnings.push(
      `Contenuto oltre la scena: ${content.scrollHeight - content.clientHeight} px restano fuori dalla vista spaziale e vengono tagliati in PDF e video.`,
    );
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
  function frameField(field: keyof Frame, label: string, short: string) {
    if (!single?.frame) return null;
    const frame = single.frame;
    return (
      <Numeric
        key={`${single.id}-${field}`}
        label={label}
        short={short}
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
  const excerpt = (block: Block) => {
    const d = block.data as Record<string, unknown>;
    const text = [d.text, d.alt, d.label, d.title, d.source].find(
      (v): v is string => typeof v === "string" && !!v.trim(),
    );
    return (text ?? "")
      .replace(/<[^>]*>|[*_#`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };
  const styleValue = (key: keyof BlockStyle) =>
    chosen.length ? common(key) : "";
  const setStyle = (key: keyof BlockStyle, value: string | undefined) => {
    const r = report(
      store.execute(
        setBlockStyle(
          scene.id,
          chosen.map((b) => b.id),
          { [key]: value },
        ),
      ),
    );
    if (r.ok) announce(`${styleLabels[key]} aggiornato.`);
  };
  const segmented = (
    key: "align" | "verticalAlign",
    icons: Record<string, IconName>,
  ) => (
    <div
      className="segmented"
      role="group"
      aria-label={styleLabels[key]}
      data-disabled={!chosen.length}
    >
      {styleOptions[key].map(([value, label]) => (
        <IconButton
          key={value}
          icon={icons[value]!}
          label={`${styleLabels[key]}: ${label.toLowerCase()}`}
          pressed={styleValue(key) === value}
          disabled={!chosen.length}
          onClick={() =>
            setStyle(key, styleValue(key) === value ? undefined : value)
          }
        />
      ))}
    </div>
  );
  const selectionText = single
    ? `blocco ${scene.blocks.indexOf(single) + 1}`
    : chosen.length
      ? `${chosen.length} selezionati`
      : "nessuna selezione";
  return (
    <section
      className="layout-panel inspector-section"
      aria-labelledby="layout-panel-title"
    >
      <div className="section-head">
        <h2 id="layout-panel-title">Impaginazione</h2>
        <span className="chip">{canvas ? "Canvas" : "Flow"}</span>
        <div className="section-tools">
          {canvas && (
            <IconButton
              icon="layers"
              label="Torna a flow"
              shortcut="rimuove i frame, con conferma"
              onClick={onFlow}
            />
          )}
          <IconButton
            icon="select-all"
            label="Seleziona tutti"
            disabled={!scene.blocks.length}
            onClick={() => {
              onSelect(scene.blocks.map((b) => b.id));
              announce(`Selezionati ${scene.blocks.length} blocchi.`);
            }}
          />
          <IconButton
            icon="deselect"
            label="Deseleziona"
            tip="left"
            disabled={!selection.length}
            onClick={() => onSelect([])}
          />
        </div>
      </div>
      <p
        className="layout-live visually-hidden"
        role="status"
        aria-live="polite"
      >
        {announcement}
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {!canvas && (
        <div className="convert-row">
          <p>
            I contenuti sono impilati. In canvas ognuno ha posizione,
            dimensione, rotazione e livello.
          </p>
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
        </div>
      )}
      {canvas && (
        <div className="inspector-group">
          <h3>
            Disposizione <span>{selectionText}</span>
          </h3>
          {single?.frame && (
            <div className="prop-grid layout-numbers inline-fields">
              {frameField("x", "X frame", "X")}
              {frameField("y", "Y frame", "Y")}
              {frameField("rotation", "Rotazione frame", "R")}
              {frameField("width", "Larghezza frame", "L")}
              {frameField("height", "Altezza frame", "A")}
              {frameField("z", "Livello z", "Z")}
            </div>
          )}
          <div
            className="tool-row"
            role="group"
            aria-label="Allinea e distribuisci"
          >
            {(
              [
                ["left", "A sinistra", "align-left"],
                ["center", "Al centro orizzontale", "align-center"],
                ["right", "A destra", "align-right"],
                ["top", "In alto", "align-top"],
                ["middle", "Al centro verticale", "align-middle"],
                ["bottom", "In basso", "align-bottom"],
              ] as const
            ).map(([alignment, label, icon]) => (
              <IconButton
                key={alignment}
                icon={icon}
                label={`Allinea ${label.toLowerCase()}`}
                disabled={!framed.length}
                onClick={() => align(alignment, label.toLowerCase())}
              />
            ))}
            <span className="tool-separator" aria-hidden="true" />
            <IconButton
              icon="distribute-h"
              label="Distribuisci in orizzontale"
              disabled={framed.length < 3}
              onClick={() => distribute("horizontal")}
            />
            <IconButton
              icon="distribute-v"
              label="Distribuisci in verticale"
              tip="left"
              disabled={framed.length < 3}
              onClick={() => distribute("vertical")}
            />
          </div>
          <div className="tool-row" role="group" aria-label="Livelli e griglia">
            {(
              [
                ["forward", "Porta avanti", "forward"],
                ["backward", "Porta indietro", "backward"],
                ["front", "In primo piano", "front"],
                ["back", "In fondo", "back"],
              ] as const
            ).map(([order, label, icon]) => (
              <IconButton
                key={order}
                icon={icon}
                label={label}
                disabled={!framed.length}
                onClick={() => stack(order, `${label}: livello aggiornato.`)}
              />
            ))}
            <span className="tool-separator" aria-hidden="true" />
            <IconButton
              icon="grid"
              label="Griglia magnetica"
              pressed={grid > 0}
              onClick={() => onGrid(grid > 0 ? 0 : 16)}
            />
            {grid > 0 && (
              <select
                className="compact-select"
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
            )}
          </div>
        </div>
      )}
      <div className="inspector-group">
        <h3>
          Stile del blocco <span>{chosen.length ? selectionText : "—"}</span>
        </h3>
        <div className="style-row">
          {segmented("align", {
            start: "text-start",
            center: "text-center",
            end: "text-end",
            justify: "text-justify",
          })}
          {segmented("verticalAlign", {
            start: "v-start",
            center: "v-center",
            end: "v-end",
          })}
        </div>
        <div className="prop-grid two">
          {(["size", "color"] as const).map((key) => {
            const options =
              key === "color"
                ? palette.map((p) => [p.id, p.id] as [string, string])
                : styleOptions[key];
            const value = styleValue(key);
            return (
              <label key={key} className="prop">
                <span>{key === "size" ? "Dimensione" : "Colore"}</span>
                <select
                  aria-label={styleLabels[key]}
                  disabled={!chosen.length}
                  value={value}
                  onChange={(e) => setStyle(key, e.target.value || undefined)}
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
        </div>
      </div>
      <div className="inspector-group">
        <h3>Aspetto della scena</h3>
        <div className="prop-grid two">
          <label className="prop">
            <span>Variante</span>
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
              <option value="card">Card</option>
              <option value="plain">Semplice</option>
            </select>
          </label>
          <label className="prop">
            <span>Sfondo</span>
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
              <option value="">Predefinito</option>
              {palette.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="switch">
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
          <span>Titolo visibile</span>
        </label>
        <p className="panel-note">
          Nascosto, il titolo resta nome accessibile e voce della vista
          testuale.
        </p>
      </div>
      <div className="inspector-group reading-order">
        <h3>
          Ordine di lettura <span>DOM · Tab · vista testuale</span>
        </h3>
        <ol aria-label="Ordine di lettura">
          {scene.blocks.map((block, i) => (
            <li
              key={block.id}
              className={selection.includes(block.id) ? "selected" : ""}
            >
              <button
                type="button"
                tabIndex={0}
                className="order-item"
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
                <span className="order-index">{i + 1}</span>
                <span className="order-type">
                  {blockTypes[block.type].label}
                </span>
                <span className="order-text">{excerpt(block)}</span>
                {block.frame && (
                  <span
                    className="order-z"
                    aria-label={`livello ${block.frame.z}`}
                  >
                    z{block.frame.z}
                  </span>
                )}
              </button>
              <IconButton
                icon="up"
                label={`Anticipa nella lettura il blocco ${i + 1}`}
                tip="left"
                disabled={i === 0}
                onClick={() => {
                  const r = report(
                    store.execute(moveInReadingOrder(scene.id, block.id, -1)),
                  );
                  if (r.ok) announce(`Blocco ora in posizione ${i}.`);
                }}
              />
              <IconButton
                icon="down"
                label={`Posticipa nella lettura il blocco ${i + 1}`}
                tip="left"
                disabled={i === scene.blocks.length - 1}
                onClick={() => {
                  const r = report(
                    store.execute(moveInReadingOrder(scene.id, block.id, 1)),
                  );
                  if (r.ok) announce(`Blocco ora in posizione ${i + 2}.`);
                }}
              />
            </li>
          ))}
        </ol>
        <p className="panel-note">
          Il livello z cambia solo la sovrapposizione, mai l’ordine di lettura.
        </p>
      </div>
      <section
        className="inspector-group layout-diagnostics"
        aria-labelledby="layout-diagnostics-title"
      >
        <h3 id="layout-diagnostics-title">
          Diagnostica{" "}
          <span className={`count ${warnings.length ? "has-issues" : ""}`}>
            {warnings.length}
          </span>
        </h3>
        {warnings.length ? (
          <ul>
            {warnings.map((w) => (
              <li key={w}>
                <Icon name="warning" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel-note">Nessun problema rilevato nella scena.</p>
        )}
      </section>
    </section>
  );
}
