import { useState } from "react";
import { failure, success } from "@spatialdeck/core";
import type { Block, Scene, JsonValue } from "@spatialdeck/core";
import { editScene, randomId } from "../commands/index.js";
import type { EditorStore } from "../store/index.js";
import { TextField } from "./Inspector.js";
import { sampleInspector } from "@spatialdeck/plugins/sample";
export function ContentPanel({
  store,
  scene,
}: {
  store: EditorStore;
  scene: Scene;
}) {
  const [type, setType] = useState<Block["type"]>("markdown"),
    [error, setError] = useState("");
  const edit = (blocks: Block[]) =>
    store.execute(editScene(scene.id, { blocks }));
  /** Text edits of one block field coalesce into one undo command per session. */
  const write = (block: Block, field: string, data: unknown) =>
    store.coalesce(
      `block:${scene.id}:${block.id}:${field}`,
      editScene(scene.id, {
        blocks: scene.blocks.map((b) =>
          b.id === block.id ? ({ ...b, data } as Block) : b,
        ),
      }),
    );
  const end = () => store.endCoalesce();
  function add(kind: Block["type"]) {
    const doc = store.getSnapshot().document;
    const asset = doc.assets.find((a) => a.mime.startsWith(kind + "/")),
      path = doc.paths.find((p) => p.nodes.length);
    if (["image", "audio", "video"].includes(kind) && !asset) {
      setError(`Aggiungi prima una risorsa ${kind} nel pannello Risorse.`);
      return;
    }
    const defaults: Record<Block["type"], unknown> = {
      text: { text: "Nuovo testo" },
      markdown: { source: "**Nuovo Markdown**" },
      html: { source: "<p>Nuovo HTML</p>" },
      svg: {
        source:
          '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#215baf"/></svg>',
        alt: "Cerchio blu",
      },
      latex: {
        source: "E=mc^2",
        display: true,
        alt: "E uguale m c al quadrato",
      },
      image: {
        assetId: asset?.id,
        alt: "Descrizione immagine",
        fit: "contain",
      },
      audio: {
        assetId: asset?.id,
        label: "Audio locale",
        autoplay: false,
        loop: false,
        onExit: "pause",
      },
      video: {
        assetId: asset?.id,
        label: "Video locale",
        alt: "Descrizione video",
        autoplay: false,
        loop: false,
        onExit: "pause",
      },
      link: {
        label: "Vai alla scena",
        target: { pathId: path?.id, nodeId: path?.nodes[0]?.id },
      },
      embed: { url: "https://example.invalid/", title: "Contenuto esterno" },
      plugin: {
        pluginId: "org.spatialdeck.badge",
        apiVersion: "1.0.0",
        dataVersion: "1.0.0",
        payload: { label: "Plugin locale" },
      },
    };
    const result = edit([
      ...scene.blocks,
      { id: randomId(), type: kind, data: defaults[kind] } as Block,
    ]);
    setError(
      result.ok ? "" : result.diagnostics.map((d) => d.message).join("; "),
    );
  }
  return (
    <fieldset className="content-panel">
      <legend>
        Contenuti <span>ordine di lettura</span>
      </legend>
      {scene.blocks.map((block, i) => (
        <fieldset key={`${scene.id}-${block.id}`} className="block-editor">
          <legend>
            {i + 1} · {block.type}
          </legend>
          {block.type === "text" ? (
            <TextField
              label={`Testo ${i + 1}`}
              value={block.data.text}
              multiline
              apply={(text) => write(block, "text", { text })}
              onEnd={end}
            />
          ) : (
            <>
              {"source" in block.data && (
                <TextField
                  label={`Sorgente ${block.type} ${i + 1}`}
                  value={block.data.source}
                  multiline
                  apply={(source) =>
                    write(block, "source", { ...block.data, source })
                  }
                  onEnd={end}
                />
              )}
              {block.type === "plugin" &&
                block.data.pluginId === sampleInspector.pluginId &&
                !!block.data.payload &&
                typeof block.data.payload === "object" &&
                !Array.isArray(block.data.payload) &&
                typeof block.data.payload.label === "string" && (
                  <TextField
                    label={`Plugin label ${i + 1}`}
                    value={block.data.payload.label}
                    apply={(value) => {
                      try {
                        return write(block, "plugin-label", {
                          ...block.data,
                          payload: sampleInspector.edit(
                            block.data.payload,
                            "label",
                            value,
                          ),
                        });
                      } catch (e) {
                        return failure("PLUGIN_DATA", String(e));
                      }
                    }}
                    onEnd={end}
                  />
                )}
              <details>
                <summary>Dati {block.type}</summary>
                <TextField
                  label={`Dati ${block.type} ${i + 1}`}
                  value={JSON.stringify(block.data, null, 2)}
                  multiline
                  apply={(text) => {
                    try {
                      return write(
                        block,
                        "data",
                        JSON.parse(text) as JsonValue,
                      );
                    } catch {
                      return failure(
                        "CONTENT_JSON",
                        "JSON del blocco non valido.",
                      );
                    }
                  }}
                  onEnd={end}
                />
              </details>
            </>
          )}
          <div className="block-actions">
            <button
              type="button"
              tabIndex={0}
              disabled={i === 0}
              aria-label={`Sposta su blocco ${i + 1}`}
              onClick={() => {
                const blocks = [...scene.blocks];
                [blocks[i - 1], blocks[i]] = [blocks[i]!, blocks[i - 1]!];
                edit(blocks);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              tabIndex={0}
              disabled={i === scene.blocks.length - 1}
              aria-label={`Sposta giù blocco ${i + 1}`}
              onClick={() => {
                const blocks = [...scene.blocks];
                [blocks[i + 1], blocks[i]] = [blocks[i]!, blocks[i + 1]!];
                edit(blocks);
              }}
            >
              ↓
            </button>
            <button
              type="button"
              tabIndex={0}
              onClick={() =>
                edit(scene.blocks.filter((b) => b.id !== block.id))
              }
              aria-label={`Elimina blocco ${i + 1}`}
            >
              Elimina
            </button>
          </div>
        </fieldset>
      ))}
      <button tabIndex={0} onClick={() => add("text")}>
        Aggiungi testo
      </button>
      <label>
        Tipo contenuto
        <select
          aria-label="Tipo contenuto"
          value={type}
          onChange={(e) => {
            setType(e.target.value as Block["type"]);
            setError("");
          }}
        >
          {[
            "markdown",
            "html",
            "svg",
            "latex",
            "image",
            "audio",
            "video",
            "link",
            "embed",
            "plugin",
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <button tabIndex={0} onClick={() => add(type)}>
        Aggiungi contenuto
      </button>
      {error && <p role="alert">{error}</p>}
      <TextField
        label="Impostazioni plugin documento"
        value={JSON.stringify(
          store.getSnapshot().document.pluginSettings ?? {},
          null,
          2,
        )}
        multiline
        apply={(text) => {
          try {
            const data = JSON.parse(text);
            return store.execute((doc) => {
              doc.pluginSettings = data;
              return success(doc);
            });
          } catch {
            return failure("PLUGIN_SETTINGS", "JSON impostazioni non valido.");
          }
        }}
      />
    </fieldset>
  );
}
