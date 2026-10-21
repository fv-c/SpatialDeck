import validate from "./validator.js";
import type { ProjectDocument } from "./types.js";
export * from "./types.js";
export interface Diagnostic {
  code: string;
  severity: "error" | "warning" | "info";
  pointer: string;
  message: string;
  hint?: string;
}
export type Result<T> =
  | { ok: true; value: T; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };
export const diagnostic = (
  code: string,
  message: string,
  pointer = "",
): Diagnostic => ({ code, severity: "error", pointer, message });
export const failure = <T = never>(
  code: string,
  message: string,
  pointer = "",
): Result<T> => ({
  ok: false,
  diagnostics: [diagnostic(code, message, pointer)],
});
export const success = <T>(value: T): Result<T> => ({
  ok: true,
  value,
  diagnostics: [],
});
const limit = 10 * 1024 * 1024;
// Reject non-JSON objects/cycles before Ajv; do not invoke getters or toJSON.
function inspect(
  value: unknown,
  depth = 0,
  ancestors = new Set<object>(),
  budget = { nodes: 0 },
): void {
  if (++budget.nodes > limit) throw new Error("JSON exceeds 10 MiB");
  if (depth > 64) throw new Error("JSON depth exceeds 64");
  if (typeof value === "number" && !Number.isFinite(value))
    throw new Error("Numbers must be finite");
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return;
  }
  if (typeof value === "string") {
    if (new TextEncoder().encode(value).length > limit)
      throw new Error("JSON exceeds 10 MiB");
    return;
  }
  if (typeof value !== "object")
    throw new Error("Only JSON values are allowed");
  if (ancestors.has(value)) throw new Error("Cyclic JSON");
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    throw new Error("Only plain JSON objects are allowed");
  if (Object.getOwnPropertySymbols(value).length)
    throw new Error("Symbol keys are not JSON");
  if (
    Array.isArray(value) &&
    (Object.keys(value).length !== value.length ||
      Object.keys(value).some((key, i) => key !== String(i)))
  )
    throw new Error("Arrays must be dense without extra properties");
  ancestors.add(value);
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if (Array.isArray(value) && key === "length") continue;
    if (!descriptor.enumerable || !("value" in descriptor))
      throw new Error("Accessors are not JSON");
    if (new TextEncoder().encode(key).length > limit)
      throw new Error("JSON exceeds 10 MiB");
    inspect(descriptor.value, depth + 1, ancestors, budget);
  }
  ancestors.delete(value);
}
function normalizedPath(path: string): string | null {
  let decoded = path;
  try {
    for (let i = 0; i < 8; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }
  const valid =
    !decoded.includes("%") &&
    !/[\\:?#]/.test(decoded) &&
    !Array.from(decoded).some(
      (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
    ) &&
    !decoded.startsWith("/") &&
    decoded.split("/").every((p) => p !== "" && p !== "." && p !== "..");
  return valid ? decoded.normalize("NFC") : null;
}
export function validateDocument(input: unknown): Result<ProjectDocument> {
  let data: unknown = input;
  try {
    if (typeof input === "string") {
      if (new TextEncoder().encode(input).length > limit)
        return failure("JSON_LIMIT", "JSON exceeds 10 MiB");
      data = JSON.parse(input);
    }
    inspect(data);
    data = structuredClone(data);
    if (new TextEncoder().encode(JSON.stringify(data)).length > limit)
      return failure("JSON_LIMIT", "JSON exceeds 10 MiB");
  } catch (error) {
    return failure("INVALID_JSON", String(error));
  }
  if (
    data &&
    typeof data === "object" &&
    "schemaVersion" in data &&
    data.schemaVersion !== "1.0.0"
  )
    return failure(
      "UNSUPPORTED_VERSION",
      "Only schema 1.0.0 is supported",
      "/schemaVersion",
    );
  if (!validate(data))
    return {
      ok: false,
      diagnostics: (validate.errors ?? []).map((e) =>
        diagnostic(
          "SCHEMA_INVALID",
          e.message ?? "Invalid schema",
          e.instancePath,
        ),
      ),
    };
  const doc = data as ProjectDocument,
    diagnostics: Diagnostic[] = [];
  const add = (code: string, message: string, pointer: string) =>
    diagnostics.push(diagnostic(code, message, pointer));
  const unique = (items: { id: string }[], pointer: string) => {
    const ids = new Set<string>();
    items.forEach((item, i) => {
      if (ids.has(item.id))
        add("DUPLICATE_ID", `Duplicate ID ${item.id}`, `${pointer}/${i}/id`);
      ids.add(item.id);
    });
  };
  unique(doc.scenes, "/scenes");
  unique(doc.assets, "/assets");
  unique(doc.paths, "/paths");
  const scenes = new Map(doc.scenes.map((s) => [s.id, s]));
  doc.scenes.forEach((s, i) => unique(s.blocks, `/scenes/${i}/blocks`));
  let total = 0;
  const paths = new Set<string>();
  doc.assets.forEach((a, i) => {
    total += a.byteLength;
    const canonical = normalizedPath(a.path);
    if (canonical === null)
      add(
        "UNSAFE_ASSET_PATH",
        "Asset path must be a safe relative path",
        `/assets/${i}/path`,
      );
    if (canonical !== null && paths.has(canonical))
      add(
        "DUPLICATE_ASSET_PATH",
        "Duplicate normalized asset path",
        `/assets/${i}/path`,
      );
    if (canonical !== null) paths.add(canonical);
  });
  if (total > 200 * 1024 * 1024)
    add("ASSET_LIMIT", "Assets exceed 200 MiB", "/assets");
  if (
    doc.defaultPathId !== null &&
    !doc.paths.some((p) => p.id === doc.defaultPathId)
  )
    add("MISSING_REFERENCE", "Unknown default path", "/defaultPathId");
  doc.paths.forEach((p, i) => {
    const pointer = `/paths/${i}`;
    unique(p.nodes, `${pointer}/nodes`);
    unique(p.edges, `${pointer}/edges`);
    const nodes = new Map(p.nodes.map((n) => [n.id, n])),
      next = new Map<string, string>(),
      incoming = new Set<string>();
    p.nodes.forEach((n, j) => {
      if (!scenes.get(n.sceneId)?.visible)
        add(
          "MISSING_REFERENCE",
          "Target scene is missing or invisible",
          `${pointer}/nodes/${j}/sceneId`,
        );
    });
    p.edges.forEach((e, j) => {
      if (!nodes.has(e.from) || !nodes.has(e.to))
        add(
          "MISSING_REFERENCE",
          "Unknown edge endpoint",
          `${pointer}/edges/${j}`,
        );
      if (next.has(e.from) || incoming.has(e.to))
        add(
          "NONLINEAR_PATH",
          "At most one incoming and outgoing edge is allowed",
          `${pointer}/edges/${j}`,
        );
      next.set(e.from, e.to);
      incoming.add(e.to);
    });
    const seen = new Set<string>();
    let node = p.startNodeId;
    while (node !== null && nodes.has(node) && !seen.has(node)) {
      seen.add(node);
      node = next.get(node) ?? null;
    }
    if (
      (p.nodes.length === 0 &&
        (p.startNodeId !== null || p.edges.length !== 0)) ||
      (p.nodes.length > 0 &&
        (p.startNodeId === null ||
          incoming.has(p.startNodeId) ||
          seen.size !== p.nodes.length ||
          node !== null))
    )
      add(
        "NONLINEAR_PATH",
        "Path must be one reachable acyclic chain",
        pointer,
      );
  });
  return diagnostics.length
    ? { ok: false, diagnostics }
    : success(structuredClone(doc));
}
export function migrateDocument(input: unknown): Result<ProjectDocument> {
  return validateDocument(input);
}
export function serializeDocument(input: ProjectDocument): Result<string> {
  const result = validateDocument(input);
  if (!result.ok) return result;
  const ordered = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(ordered)
      : v !== null && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, x]) => [k, ordered(x)]),
          )
        : v;
  return success(JSON.stringify(ordered(result.value), null, 2) + "\n");
}
