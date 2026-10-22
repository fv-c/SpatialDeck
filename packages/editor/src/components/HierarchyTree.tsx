import type { Scene } from "@spatialdeck/core";
import type { EditorSession, EditorStore } from "../store/index.js";
import { reparent } from "../commands/index.js";
import { useState } from "react";
export function HierarchyTree({
  store,
  session,
}: {
  store: EditorStore;
  session: EditorSession;
}) {
  const [error, setError] = useState("");
  const selected = session.document.scenes.find(
    (s) => s.id === session.selection,
  );
  const render = (parentId: string | null): React.ReactNode =>
    session.document.scenes
      .filter((s) => s.parentId === parentId)
      .map((s) => (
        <li key={s.id}>
          <button
            type="button"
            aria-pressed={session.selection === s.id}
            onClick={() => store.select(s.id)}
          >
            {s.title}
          </button>
          {session.document.scenes.some((child) => child.parentId === s.id) && (
            <ul>{render(s.id)}</ul>
          )}
        </li>
      ));
  const forbidden = (s: Scene) => {
    let next: Scene | undefined = s;
    while (next) {
      if (next.id === selected?.id) return true;
      const parent: string | null = next.parentId;
      next = session.document.scenes.find((n) => n.id === parent);
    }
    return false;
  };
  return (
    <details className="hierarchy-panel">
      <summary>Gerarchia spaziale</summary>
      <ul aria-label="Albero gerarchia">{render(null)}</ul>
      {selected && (
        <label>
          Parent della scena
          <select
            aria-label="Parent della scena"
            value={selected.parentId ?? ""}
            onChange={(e) => {
              const result = store.execute(
                reparent(selected.id, e.target.value || null),
              );
              setError(
                result.ok
                  ? ""
                  : result.diagnostics.map((d) => d.message).join("; "),
              );
            }}
          >
            <option value="">Spazio principale</option>
            {session.document.scenes
              .filter((s) => !forbidden(s))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
          </select>
        </label>
      )}
      <p>
        Il cambio parent conserva la posizione nel mondo. Coordinate e rotazioni
        nell’inspector sono locali.
      </p>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
