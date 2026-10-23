import { useState } from "react";
import { contrastIssues } from "@spatialdeck/core";
import type { FontId, ProjectDocument, Result, Theme } from "@spatialdeck/core";
import { editTheme } from "../commands/index.js";
import type { EditorStore } from "../store/index.js";
import { Numeric } from "./Inspector.js";

export const fontNames: Record<FontId, string> = {
  "system-sans": "Sistema, sans-serif",
  "system-serif": "Sistema, serif",
  "system-mono": "Sistema, monospace",
  "atkinson-hyperlegible": "Atkinson Hyperlegible (locale, OFL)",
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
const roles: Array<[keyof Theme["colors"], string]> = [
  ["text", "Colore del testo"],
  ["background", "Sfondo delle card"],
  ["accent", "Accento e bordo"],
  ["backdrop", "Fondale"],
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
    <details className="theme-panel">
      <summary>
        Tema del documento{" "}
        <span>{issues.length ? `${issues.length} avvisi` : "OK"}</span>
      </summary>
      <div className="theme-content">
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <fieldset>
          <legend>Palette</legend>
          <ul className="palette">
            {theme.palette.map((entry, i) => (
              <li key={entry.id}>
                <label>
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
                  <span>
                    {entry.id} <code>{entry.value}</code>
                  </span>
                </label>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label={`Rimuovi colore ${entry.id}`}
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
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            tabIndex={0}
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
            Aggiungi colore
          </button>
        </fieldset>
        <fieldset>
          <legend>Ruoli</legend>
          {roles.map(([role, label]) => (
            <label key={role}>
              {label}
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
                    {p.id} ({p.value})
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Font locali</legend>
          {(
            [
              ["body", "Font del testo"],
              ["heading", "Font dei titoli"],
            ] as const
          ).map(([slot, label]) => (
            <label key={slot}>
              {label}
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
        </fieldset>
        <fieldset>
          <legend>
            Scala tipografica <span>px</span>
          </legend>
          <div className="numeric-row">
            <Numeric
              label="Corpo del testo"
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
        </fieldset>
        <section aria-label="Contrasto del tema">
          {issues.length ? (
            <ul className="contrast-list">
              {issues.map((issue) => (
                <li key={issue.pointer}>
                  Contrasto {issue.ratio.toFixed(2)}:1 sotto {issue.minimum}:1 (
                  {issue.kind === "text" ? "testo" : "componenti"}):{" "}
                  {where(document, issue.pointer)}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Contrasto della palette sufficiente (4,5:1 testo, 3:1 componenti).
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
