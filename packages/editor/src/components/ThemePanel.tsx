import { useState } from "react";
import { contrastIssues } from "@spatialdeck/core";
import type { FontId, ProjectDocument, Result, Theme } from "@spatialdeck/core";
import { editTheme } from "../commands/index.js";
import type { EditorStore } from "../store/index.js";
import { Numeric } from "./Inspector.js";
import { Icon, IconButton } from "./icons.js";

export const fontNames: Record<FontId, string> = {
  "system-sans": "Sans di sistema",
  "system-serif": "Serif di sistema",
  "system-mono": "Mono di sistema",
  "atkinson-hyperlegible": "Atkinson Hyperlegible",
};
/** Where a contrast issue lives, in the words of the panels. */
function where(document: ProjectDocument, pointer: string): string {
  if (pointer === "/theme/colors/text") return "testo del tema sullo sfondo";
  if (pointer === "/theme/colors/accent") return "accento sul fondale";
  const [, , scene, , block] = pointer.split("/");
  const title = document.scenes[Number(scene)]?.title ?? "";
  return block === undefined
    ? `sfondo della scena “${title}”`
    : `blocco ${Number(block) + 1} della scena “${title}”`;
}
const roles: Array<[keyof Theme["colors"], string, string]> = [
  ["text", "Colore del testo", "Testo"],
  ["background", "Sfondo delle card", "Card"],
  ["accent", "Accento e bordo", "Accento"],
  ["backdrop", "Fondale", "Fondale"],
];
/** Document theme: palette, roles, local fonts and type scale; tokens only, never CSS. */
export function ThemePanel({
  store,
  document,
}: {
  store: EditorStore;
  document: ProjectDocument;
}) {
  const [error, setError] = useState("");
  const theme = document.theme;
  const report = (result: Result<void>) => {
    setError(
      result.ok
        ? ""
        : result.diagnostics.some((d) => d.code === "UNKNOWN_PALETTE_COLOR")
          ? "Il colore è ancora usato da un ruolo, una scena o un blocco."
          : (result.diagnostics[0]?.message ?? "Modifica rifiutata."),
    );
    return result;
  };
  const issues = contrastIssues(document);
  return (
    <div className="theme-panel">
      <div className="theme-content">
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="inspector-group">
          <h3>
            Palette <span>{theme.palette.length}/32</span>
          </h3>
          <ul className="palette">
            {theme.palette.map((entry, i) => (
              <li key={entry.id}>
                <label className="swatch">
                  <input
                    type="color"
                    aria-label={`Colore ${entry.id}`}
                    value={entry.value}
                    onChange={(e) =>
                      report(
                        store.coalesce(
                          `theme:palette:${entry.id}`,
                          editTheme((t) => {
                            t.palette[i]!.value = e.target.value.toLowerCase();
                          }),
                        ),
                      )
                    }
                    onBlur={() => store.endCoalesce()}
                  />
                  <span className="swatch-name">{entry.id}</span>
                  <code>{entry.value}</code>
                </label>
                <IconButton
                  icon="close"
                  label={`Rimuovi colore ${entry.id}`}
                  tip="left"
                  disabled={theme.palette.length === 1}
                  onClick={() =>
                    report(
                      store.execute(
                        editTheme((t) => {
                          t.palette.splice(i, 1);
                        }),
                      ),
                    )
                  }
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            tabIndex={0}
            className="tool-button"
            aria-label="Aggiungi colore"
            disabled={theme.palette.length >= 32}
            onClick={() => {
              let n = theme.palette.length + 1;
              while (theme.palette.some((p) => p.id === `colore-${n}`)) n++;
              report(
                store.execute(
                  editTheme((t) => {
                    t.palette.push({ id: `colore-${n}`, value: "#5b6474" });
                  }),
                ),
              );
            }}
          >
            <Icon name="plus" />
            Colore
          </button>
        </div>
        <div className="inspector-group">
          <h3>Ruoli</h3>
          <div className="prop-grid two">
            {roles.map(([role, label, short]) => (
              <label key={role} className="prop">
                <span>{short}</span>
                <select
                  aria-label={label}
                  value={theme.colors[role]}
                  onChange={(e) =>
                    report(
                      store.execute(
                        editTheme((t) => {
                          t.colors[role] = e.target.value;
                        }),
                      ),
                    )
                  }
                >
                  {theme.palette.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
        <div className="inspector-group">
          <h3>
            Tipografia <span>font locali · px</span>
          </h3>
          <div className="prop-grid two">
            {(
              [
                ["body", "Font del testo", "Testo"],
                ["heading", "Font dei titoli", "Titoli"],
              ] as const
            ).map(([slot, label, short]) => (
              <label key={slot} className="prop">
                <span>{short}</span>
                <select
                  aria-label={label}
                  value={theme.fonts[slot]}
                  onChange={(e) =>
                    report(
                      store.execute(
                        editTheme((t) => {
                          t.fonts[slot] = e.target.value as FontId;
                        }),
                      ),
                    )
                  }
                >
                  {(Object.keys(fontNames) as FontId[]).map((id) => (
                    <option key={id} value={id}>
                      {fontNames[id]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <Numeric
              label="Corpo del testo"
              short="Corpo"
              value={theme.typeScale.body}
              apply={(value) =>
                report(
                  store.execute(
                    editTheme((t) => {
                      t.typeScale.body = value;
                    }),
                  ),
                )
              }
            />
            <Numeric
              label="Titoli"
              value={theme.typeScale.title}
              apply={(value) =>
                report(
                  store.execute(
                    editTheme((t) => {
                      t.typeScale.title = value;
                    }),
                  ),
                )
              }
            />
          </div>
        </div>
        <section className="inspector-group" aria-label="Contrasto del tema">
          <h3>Contrasto</h3>
          {issues.length ? (
            <ul className="contrast-list">
              {issues.map((issue) => (
                <li key={issue.pointer}>
                  <Icon name="warning" />
                  <span>
                    {issue.ratio.toFixed(2)}:1, sotto {issue.minimum}:1 (
                    {issue.kind === "text" ? "testo" : "componenti"}):{" "}
                    {where(document, issue.pointer)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-note">
              Sufficiente: 4,5:1 per il testo, 3:1 per i componenti.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
