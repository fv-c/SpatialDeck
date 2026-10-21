import {
  failure,
  serializeDocument,
  success,
  validateDocument,
} from "@spatialdeck/core";
import type { ProjectDocument, Result } from "@spatialdeck/core";
import type { DocumentEdit } from "../commands/index.js";
export interface MapCamera {
  x: number;
  y: number;
  zoom: number;
}
export interface EditorSession {
  document: ProjectDocument;
  selection: string | null;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  dragging: boolean;
  map: MapCamera;
  historyBytes: number;
  historyLength: number;
}
interface Command {
  before: ProjectDocument;
  after: ProjectDocument;
  selectionBefore: string | null;
  selectionAfter: string | null;
  bytes: number;
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value)) freeze(v);
  }
  return value;
}
export class EditorStore {
  private document: ProjectDocument;
  private selection: string | null;
  private saved: string;
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private drag: { document: ProjectDocument; selection: string } | undefined;
  private listeners = new Set<() => void>();
  private map: MapCamera = { x: 0, y: 0, zoom: 0.25 };
  private snapshot!: EditorSession;
  constructor(
    input: unknown,
    private limits = { commands: 100, bytes: 20 * 1024 * 1024 },
  ) {
    const result = validateDocument(input);
    if (!result.ok) throw new Error(result.diagnostics[0]?.message);
    this.document = freeze(result.value);
    this.selection = this.document.scenes[0]?.id ?? null;
    this.saved = JSON.stringify(this.document);
    this.publish();
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish() {
    this.snapshot = freeze({
      document: this.document,
      selection: this.selection,
      dirty: JSON.stringify(this.document) !== this.saved,
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      dragging: !!this.drag,
      map: this.map,
      historyBytes: [...this.undoStack, ...this.redoStack].reduce(
        (n, c) => n + c.bytes,
        0,
      ),
      historyLength: this.undoStack.length,
    });
    for (const l of this.listeners) l();
  }
  select(id: string | null) {
    if (id === null || this.document.scenes.some((s) => s.id === id)) {
      this.selection = id;
      this.publish();
    }
  }
  setMap(map: MapCamera) {
    if (
      Object.values(map).every(Number.isFinite) &&
      map.zoom >= 0.02 &&
      map.zoom <= 2
    ) {
      this.map = { ...map };
      this.publish();
    }
  }
  private record(before: ProjectDocument, selectionBefore: string | null) {
    if (JSON.stringify(before) === JSON.stringify(this.document)) {
      this.publish();
      return;
    }
    const bytes = new TextEncoder().encode(
      JSON.stringify([before, this.document]),
    ).byteLength;
    this.redoStack = [];
    this.undoStack.push({
      before,
      after: this.document,
      selectionBefore,
      selectionAfter: this.selection,
      bytes,
    });
    while (
      this.undoStack.length > this.limits.commands ||
      this.undoStack.reduce((n, c) => n + c.bytes, 0) > this.limits.bytes
    )
      this.undoStack.shift();
    this.publish();
  }
  execute(edit: DocumentEdit, selectNew = false): Result<void> {
    if (this.drag)
      return failure("DRAG_ACTIVE", "Termina o annulla il trascinamento.");
    const before = this.document,
      selection = this.selection;
    const edited = edit(structuredClone(before));
    if (!edited.ok) return edited;
    const valid = validateDocument(edited.value);
    if (!valid.ok) return valid;
    this.document = freeze(valid.value);
    if (selectNew)
      this.selection =
        this.document.scenes.find(
          (s) => !before.scenes.some((old) => old.id === s.id),
        )?.id ?? this.selection;
    if (!this.document.scenes.some((s) => s.id === this.selection)) {
      const index = before.scenes.findIndex((s) => s.id === selection);
      this.selection =
        this.document.scenes[
          Math.min(Math.max(index, 0), this.document.scenes.length - 1)
        ]?.id ?? null;
    }
    this.record(before, selection);
    return success(undefined);
  }
  undo() {
    if (this.drag) this.cancelDrag();
    const command = this.undoStack.pop();
    if (!command) return;
    this.redoStack.push(command);
    this.document = command.before;
    this.selection = command.selectionBefore;
    this.publish();
  }
  redo() {
    if (this.drag) this.cancelDrag();
    const command = this.redoStack.pop();
    if (!command) return;
    this.undoStack.push(command);
    this.document = command.after;
    this.selection = command.selectionAfter;
    this.publish();
  }
  beginDrag(id: string) {
    if (this.drag) return;
    this.select(id);
    if (this.selection === id) {
      this.drag = { document: this.document, selection: id };
      this.publish();
    }
  }
  moveDrag(x: number, y: number): Result<void> {
    if (!this.drag) return failure("DRAG_INACTIVE", "Nessun trascinamento.");
    const candidate = structuredClone(this.drag.document);
    const scene = candidate.scenes.find((s) => s.id === this.drag!.selection)!;
    scene.position = [x, y, scene.position[2]];
    const valid = validateDocument(candidate);
    if (!valid.ok) return valid;
    this.document = freeze(valid.value);
    this.publish();
    return success(undefined);
  }
  endDrag() {
    const drag = this.drag;
    if (!drag) return;
    this.drag = undefined;
    this.record(drag.document, drag.selection);
  }
  cancelDrag() {
    if (!this.drag) return;
    this.document = this.drag.document;
    this.selection = this.drag.selection;
    this.drag = undefined;
    this.publish();
  }
  replace(input: unknown, saved = true): Result<void> {
    const valid = validateDocument(input);
    if (!valid.ok) return valid;
    this.document = freeze(valid.value);
    this.selection = this.document.scenes[0]?.id ?? null;
    this.undoStack = [];
    this.redoStack = [];
    this.drag = undefined;
    this.saved = saved ? JSON.stringify(this.document) : "";
    this.publish();
    return success(undefined);
  }
  markSaved(document = this.document) {
    this.saved = JSON.stringify(document);
    this.publish();
  }
  serialize() {
    return serializeDocument(this.document);
  }
}
export function parseFinite(text: string): Result<number> {
  if (!text.trim() || !Number.isFinite(Number(text)))
    return failure("INVALID_NUMBER", "Inserisci un numero finito.");
  return success(Number(text));
}
