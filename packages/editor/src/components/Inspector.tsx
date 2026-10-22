import { useEffect, useState, useId } from "react";
import type { Scene, Result } from "@spatialdeck/core";
import { ContentPanel } from "./ContentPanel.js";
import { editScene } from "../commands/index.js";
import { parseFinite } from "../store/index.js";
import type { EditorStore } from "../store/index.js";
export function Numeric({
  label,
  value,
  apply,
}: {
  label: string;
  value: number;
  apply: (value: number) => Result<void>;
}) {
  const [draft, setDraft] = useState(String(value)),
    [error, setError] = useState("");
  useEffect(() => {
    setDraft(String(value));
    setError("");
  }, [value]);
  const fieldId = useId();
  function commit() {
    const parsed = parseFinite(draft);
    const result = parsed.ok ? apply(parsed.value) : parsed;
    setError(
      result.ok ? "" : (result.diagnostics[0]?.message ?? "Valore non valido."),
    );
  }
  return (
    <label className="numeric" htmlFor={fieldId}>
      {label}
      <input
        aria-label={label}
        id={fieldId}
        type="text"
        inputMode="decimal"
        value={draft}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Tab") commit();
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(String(value));
            setError("");
          }
        }}
      />
      {error && (
        <span className="field-error" id={`${fieldId}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
export function TextField({
  label,
  value,
  apply,
  multiline = false,
}: {
  label: string;
  value: string;
  apply: (value: string) => Result<void>;
  multiline?: boolean;
}) {
  const fieldId = useId();
  const [draft, setDraft] = useState(value),
    [error, setError] = useState("");
  useEffect(() => {
    setDraft(value);
    setError("");
  }, [value]);
  function commit() {
    const result = apply(draft);
    setError(
      result.ok ? "" : (result.diagnostics[0]?.message ?? "Valore non valido."),
    );
  }
  const props = {
    "aria-label": label,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (event.key === "Tab" || (!multiline && event.key === "Enter"))
        commit();
    },
    "aria-invalid": !!error,
    "aria-describedby": error ? `${fieldId}-error` : undefined,
  };
  return (
    <label className="text-field">
      {label}
      {multiline ? <textarea {...props} rows={4} /> : <input {...props} />}{" "}
      {error && (
        <span className="field-error" id={`${fieldId}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
export function Inspector({
  store,
  scene,
}: {
  store: EditorStore;
  scene: Scene | undefined;
}) {
  if (!scene)
    return (
      <p className="empty-inspector">
        Seleziona una scena per modificarne lo spazio e i contenuti.
      </p>
    );
  const edit = (patch: Partial<Scene>) =>
    store.execute(editScene(scene.id, patch));
  return (
    <div className="inspector-content">
      <TextField
        key={`title-${scene.id}`}
        label="Titolo scena"
        value={scene.title}
        apply={(title) => edit({ title })}
      />
      <fieldset>
        <legend>
          Posizione <span>px CSS</span>
        </legend>
        <div className="numeric-row">
          {["X", "Y", "Z"].map((axis, i) => (
            <Numeric
              key={`${scene.id}-p${i}`}
              label={axis}
              value={scene.position[i]!}
              apply={(value) => {
                const position: [number, number, number] = [...scene.position];
                position[i] = value;
                return edit({ position });
              }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>
          Rotazione <span>gradi · Rz Ry Rx</span>
        </legend>
        <div className="numeric-row">
          {["Rotazione X", "Rotazione Y", "Rotazione Z"].map((axis, i) => (
            <Numeric
              key={`${scene.id}-r${i}`}
              label={axis}
              value={scene.rotation[i]!}
              apply={(value) => {
                const rotation: [number, number, number] = [...scene.rotation];
                rotation[i] = value;
                return edit({ rotation });
              }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Dimensioni e scala</legend>
        <div className="numeric-row">
          <Numeric
            key={`${scene.id}-scale`}
            label="Scala"
            value={scene.scale}
            apply={(scale) => edit({ scale })}
          />
          {["Larghezza", "Altezza"].map((axis, i) => (
            <Numeric
              key={`${scene.id}-s${i}`}
              label={axis}
              value={scene.size[i]!}
              apply={(value) => {
                const size: [number, number] = [...scene.size];
                size[i] = value;
                return edit({ size });
              }}
            />
          ))}
        </div>
      </fieldset>
      <ContentPanel store={store} scene={scene} />
      <TextField
        key={`${scene.id}-notes`}
        label="Note relatore"
        value={scene.notes}
        multiline
        apply={(notes) => edit({ notes })}
      />
    </div>
  );
}
