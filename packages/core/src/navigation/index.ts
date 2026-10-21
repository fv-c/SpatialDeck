import { diagnostic } from "../document/index.js";
import { resolveSceneCamera } from "../math/index.js";
import type {
  Diagnostic,
  ProjectDocument,
  Transition,
} from "../document/index.js";
import type { CameraPose } from "../math/index.js";
import { sampleTransition } from "../timing/index.js";
import type { TransitionPlan } from "../timing/index.js";
import type { Choice, EventSink } from "../events/index.js";
export interface Visit {
  visitId: string;
  pathId: string;
  nodeId: string;
  sceneId: string;
  camera: CameraPose;
}
export interface NavigationResult {
  status: "completed" | "noop" | "cancelled" | "choice-required" | "error";
  diagnostic?: Diagnostic;
  choices?: Choice[];
}
export interface NavigationOptions {
  durationMs?: number;
  signal?: {
    readonly aborted: boolean;
    addEventListener(
      type: "abort",
      listener: () => void,
      options?: { once: boolean },
    ): void;
    removeEventListener(type: "abort", listener: () => void): void;
  };
}
export interface PlayerState {
  status: "unmounted" | "empty" | "idle" | "transitioning" | "destroyed";
  pathId: string | null;
  nodeId: string | null;
  sceneId: string | null;
  history: Visit[];
  camera: CameraPose | null;
  transition: { id: string; to: Visit; progress: number } | null;
  choices: Choice[];
  diagnostics: Diagnostic[];
}
interface Pending {
  id: string;
  to: Visit;
  plan: TransitionPlan;
  elapsed: number;
  last: number;
  resolve: (result: NavigationResult) => void;
  removeAbort: () => void;
  back: boolean;
  reset: boolean;
}
export class NavigationMachine {
  private state: PlayerState = {
    status: "empty",
    pathId: null,
    nodeId: null,
    sceneId: null,
    history: [],
    camera: null,
    transition: null,
    choices: [],
    diagnostics: [],
  };
  private pending: Pending | undefined;
  private serial = 0;
  private generation = 0;
  private destroying = false;
  private replacing = false;
  private hidden = false;
  private reduced = false;
  constructor(
    private document: ProjectDocument,
    private instanceId: string,
    private now: () => number,
    private emit: EventSink,
    private changed: () => void,
  ) {
    const path = document.paths.find((p) => p.id === document.defaultPathId);
    this.state.pathId = path?.id ?? null;
    if (path?.startNodeId) {
      const v = this.visit(path.id, path.startNodeId);
      this.commit(v, false, true);
    }
  }
  getState(): PlayerState {
    return structuredClone(this.state);
  }
  private visit(pathId: string, nodeId: string): Visit {
    const node = this.document.paths
      .find((p) => p.id === pathId)!
      .nodes.find((n) => n.id === nodeId)!;
    const camera = resolveSceneCamera(this.document, node.sceneId);
    if (!camera.ok) throw new Error(camera.diagnostics[0]?.message);
    return {
      visitId: `${this.instanceId}-v${++this.serial}`,
      pathId,
      nodeId,
      sceneId: node.sceneId,
      camera: camera.value,
    };
  }
  private error(code: string, message: string): Promise<NavigationResult> {
    return Promise.resolve({
      status: "error",
      diagnostic: diagnostic(code, message),
    });
  }
  private guard(): Promise<NavigationResult> | undefined {
    return this.destroying ||
      this.replacing ||
      this.state.status === "destroyed"
      ? this.error("PLAYER_DESTROYED", "Player is destroyed")
      : undefined;
  }
  private commit(to: Visit, back: boolean, reset: boolean) {
    if (reset) this.state.history = [];
    if (back) this.state.history.pop();
    else this.state.history.push(to);
    Object.assign(this.state, {
      status: "idle",
      pathId: to.pathId,
      nodeId: to.nodeId,
      sceneId: to.sceneId,
      camera: structuredClone(to.camera),
      transition: null,
    });
  }
  tick(at = this.now()): void {
    const p = this.pending;
    if (!p) return;
    if (!this.hidden) p.elapsed += Math.max(0, at - p.last);
    p.last = at;
    const sample = sampleTransition(p.plan, p.elapsed);
    this.state.camera = sample.camera;
    this.state.transition = {
      id: p.id,
      to: structuredClone(p.to),
      progress: sample.progress,
    };
    if (sample.progress === 1) {
      this.pending = undefined;
      p.removeAbort();
      this.commit(p.to, p.back, p.reset);
      this.changed();
      this.emit("scenechange", {
        instanceId: this.instanceId,
        transitionId: p.id,
        visit: structuredClone(p.to),
      });
      this.emit("navigationend", {
        instanceId: this.instanceId,
        transitionId: p.id,
      });
      p.resolve({ status: "completed" });
    } else this.changed();
  }
  private cancel() {
    const p = this.pending;
    if (!p) return;
    this.pending = undefined;
    p.removeAbort();
    this.state.transition = null;
    this.state.status = this.state.nodeId ? "idle" : "empty";
    this.changed();
    this.emit("navigationcancel", {
      instanceId: this.instanceId,
      transitionId: p.id,
    });
    p.resolve({ status: "cancelled" });
  }
  private start(
    to: Visit,
    transition: Transition,
    options: NavigationOptions = {},
    back = false,
    reset = false,
  ): Promise<NavigationResult> {
    if (
      options.durationMs !== undefined &&
      (!Number.isInteger(options.durationMs) ||
        options.durationMs < 0 ||
        options.durationMs > 60000)
    )
      return this.error(
        "INVALID_DURATION",
        "Duration must be an integer between 0 and 60000",
      );
    if (options.signal?.aborted)
      return Promise.resolve({ status: "cancelled" });
    const generation = ++this.generation;
    this.tick();
    if (generation !== this.generation || this.destroying)
      return Promise.resolve({ status: "cancelled" });
    this.cancel();
    if (generation !== this.generation || this.destroying)
      return Promise.resolve({ status: "cancelled" });
    const durationMs = this.reduced
      ? 0
      : (options.durationMs ?? transition.durationMs);
    return new Promise((resolve) => {
      const id = `${this.instanceId}-t${++this.serial}`;
      const abort = () => {
        this.tick();
        if (this.pending?.id === id) this.cancel();
      };
      this.pending = {
        id,
        to,
        plan: {
          from: structuredClone(this.state.camera ?? to.camera),
          to: to.camera,
          durationMs,
          easing: transition.easing,
        },
        elapsed: 0,
        last: this.now(),
        resolve,
        removeAbort: () => options.signal?.removeEventListener("abort", abort),
        back,
        reset,
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      this.state.status = "transitioning";
      this.state.transition = { id, to: structuredClone(to), progress: 0 };
      this.changed();
      this.emit("navigationstart", {
        instanceId: this.instanceId,
        transitionId: id,
        to: structuredClone(to),
      });
      // Handlers may issue another command or destroy the player.
      if (this.pending?.id === id) this.tick();
    });
  }
  goTo(
    target: { pathId?: string; nodeId: string },
    options: NavigationOptions = {},
  ): Promise<NavigationResult> {
    const guard = this.guard();
    if (guard) return guard;
    const pathId = target.pathId ?? this.state.pathId;
    const path = this.document.paths.find((p) => p.id === pathId);
    if (!path || !path.nodes.some((n) => n.id === target.nodeId))
      return this.error("UNKNOWN_NODE", "Unknown path or node");
    if (pathId === this.state.pathId && target.nodeId === this.state.nodeId)
      return Promise.resolve({ status: "noop" });
    const edge = path.edges.find(
      (e) => e.from === this.state.nodeId && e.to === target.nodeId,
    );
    return this.start(
      this.visit(path.id, target.nodeId),
      edge?.transition ?? this.document.settings.presentation.defaultTransition,
      options,
      false,
      pathId !== this.state.pathId,
    );
  }
  next(options: { edgeId?: string } = {}): Promise<NavigationResult> {
    const guard = this.guard();
    if (guard) return guard;
    const path = this.document.paths.find((p) => p.id === this.state.pathId);
    const edges = path?.edges.filter((e) => e.from === this.state.nodeId) ?? [];
    const edge = options.edgeId
      ? edges.find((e) => e.id === options.edgeId)
      : edges[0];
    if (options.edgeId && !edge)
      return this.error(
        "UNKNOWN_EDGE",
        "Edge is not outgoing from the current node",
      );
    if (!edge) return Promise.resolve({ status: "noop" });
    return this.goTo({ nodeId: edge.to });
  }
  prev(): Promise<NavigationResult> {
    const guard = this.guard();
    if (guard) return guard;
    const previous = this.state.history.at(-2);
    if (!previous) return Promise.resolve({ status: "noop" });
    return this.start(
      structuredClone(previous),
      this.document.settings.presentation.defaultTransition,
      {},
      true,
    );
  }
  setPath(pathId: string): Promise<NavigationResult> {
    const guard = this.guard();
    if (guard) return guard;
    const path = this.document.paths.find((p) => p.id === pathId);
    if (!path) return this.error("UNKNOWN_PATH", "Unknown path");
    if (path.startNodeId)
      return this.start(
        this.visit(path.id, path.startNodeId),
        { durationMs: 0, easing: "linear" },
        {},
        false,
        true,
      );
    const generation = ++this.generation;
    this.tick();
    if (generation !== this.generation || this.destroying)
      return Promise.resolve({ status: "cancelled" });
    this.cancel();
    if (generation !== this.generation || this.destroying)
      return Promise.resolve({ status: "cancelled" });
    Object.assign(this.state, {
      status: "empty",
      pathId,
      nodeId: null,
      sceneId: null,
      camera: null,
      history: [],
      transition: null,
    });
    this.changed();
    return Promise.resolve({ status: "completed" });
  }
  /** The player supplies a validated snapshot. No cancelled destination is visited. */
  replaceDocument(document: ProjectDocument): void {
    if (this.destroying || this.replacing) return;
    this.replacing = true;
    ++this.generation;
    const previous = this.getState();
    this.cancel();
    if (this.destroying) {
      this.replacing = false;
      return;
    }
    this.document = document;
    const retained = document.paths.find(
      (p) =>
        p.id === previous.pathId &&
        p.nodes.some((n) => n.id === previous.nodeId),
    );
    const path =
      retained ?? document.paths.find((p) => p.id === document.defaultPathId);
    const nodeId = retained ? previous.nodeId : path?.startNodeId;
    this.state = {
      status: "empty",
      pathId: path?.id ?? null,
      nodeId: null,
      sceneId: null,
      history: [],
      camera: null,
      transition: null,
      choices: [],
      diagnostics: [],
    };
    if (path && nodeId) this.commit(this.visit(path.id, nodeId), false, true);
    this.replacing = false;
    this.changed();
  }
  setHidden(hidden: boolean): void {
    this.tick();
    this.hidden = hidden;
    if (this.pending) this.pending.last = this.now();
  }
  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    if (reduced && this.pending) {
      this.pending.plan.durationMs = 0;
      this.tick();
    }
  }
  destroy(): void {
    if (this.destroying || this.state.status === "destroyed") return;
    this.destroying = true;
    ++this.generation;
    this.cancel();
    this.state.status = "destroyed";
    this.changed();
  }
}
