import { failure, success } from "../document/index.js";
import type {
  Color,
  Diagnostic,
  Frame,
  ProjectDocument,
  Result,
  Vec3,
} from "../document/index.js";
import { getWorldMatrix, viewMatrix } from "../math/index.js";
import type { CameraPose } from "../math/index.js";

/**
 * Frames are 2D geometry of the scene content rectangle: origin at its top-left
 * corner, X right, Y down, rotation in degrees around the frame centre. Player
 * and editor both place blocks and handles with these functions.
 */
export type Point = [number, number];
/** CSS `matrix(a, b, c, d, e, f)`: frame-local point (u, v) -> scene point. */
export type Matrix2D = [number, number, number, number, number, number];
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type FrameHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export const MIN_FRAME_SIZE = 8;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
export function frameMatrix(frame: Frame): Matrix2D {
  const cos = Math.cos(radians(frame.rotation)),
    sin = Math.sin(radians(frame.rotation));
  const cx = frame.x + frame.width / 2,
    cy = frame.y + frame.height / 2;
  return [
    cos,
    sin,
    -sin,
    cos,
    cx - (cos * frame.width) / 2 + (sin * frame.height) / 2,
    cy - (sin * frame.width) / 2 - (cos * frame.height) / 2,
  ];
}
/** Frame-local point (0..width, 0..height) to scene content coordinates. */
export function frameToScene(frame: Frame, point: Point): Point {
  const [a, b, c, d, e, f] = frameMatrix(frame);
  return [a * point[0] + c * point[1] + e, b * point[0] + d * point[1] + f];
}
/** Scene content coordinates to frame-local coordinates (inverse rotation). */
export function sceneToFrame(frame: Frame, point: Point): Point {
  const [a, b, c, d, e, f] = frameMatrix(frame);
  const x = point[0] - e,
    y = point[1] - f;
  // The rotation block is orthonormal: its inverse is the transpose.
  return [a * x + b * y, c * x + d * y];
}
export function frameCenter(frame: Frame): Point {
  return [frame.x + frame.width / 2, frame.y + frame.height / 2];
}
/** Top-left, top-right, bottom-right, bottom-left after rotation. */
export function frameCorners(frame: Frame): [Point, Point, Point, Point] {
  return [
    frameToScene(frame, [0, 0]),
    frameToScene(frame, [frame.width, 0]),
    frameToScene(frame, [frame.width, frame.height]),
    frameToScene(frame, [0, frame.height]),
  ];
}
/** Axis-aligned bounding box of the rotated frame. */
export function frameBounds(frame: Frame): Rect {
  const corners = frameCorners(frame);
  const xs = corners.map((p) => p[0]),
    ys = corners.map((p) => p[1]);
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
/** Separating axis test on the two rotated rectangles; touching edges do not intersect. */
export function framesIntersect(a: Frame, b: Frame): boolean {
  const pa = frameCorners(a),
    pb = frameCorners(b);
  for (const polygon of [pa, pb])
    for (let i = 0; i < 2; i++) {
      const p = polygon[i]!,
        q = polygon[i + 1]!;
      const axis: Point = [q[1] - p[1], p[0] - q[0]];
      const project = (points: Point[]) =>
        points.map((r) => r[0] * axis[0] + r[1] * axis[1]);
      const ra = project(pa),
        rb = project(pb);
      const epsilon = 1e-9 * Math.max(1, Math.hypot(...axis));
      if (
        Math.max(...ra) <= Math.min(...rb) + epsilon ||
        Math.max(...rb) <= Math.min(...ra) + epsilon
      )
        return false;
    }
  return true;
}
/** Keeps the unrotated rectangle inside the scene, as the schema requires. */
export function clampFrame(frame: Frame, size: [number, number]): Frame {
  const width = Math.min(Math.max(frame.width, MIN_FRAME_SIZE), size[0]),
    height = Math.min(Math.max(frame.height, MIN_FRAME_SIZE), size[1]);
  return {
    ...frame,
    width,
    height,
    x: Math.min(Math.max(frame.x, 0), size[0] - width),
    y: Math.min(Math.max(frame.y, 0), size[1] - height),
  };
}
export function snapToGrid(value: number, grid: number): number {
  return grid > 0 ? Math.round(value / grid) * grid : value;
}
export function moveFrame(
  frame: Frame,
  dx: number,
  dy: number,
  size: [number, number],
): Frame {
  return clampFrame({ ...frame, x: frame.x + dx, y: frame.y + dy }, size);
}
/**
 * Moves the edges named by the handle by (dx, dy) in frame-local axes; the
 * opposite edges stay fixed in the scene, also for rotated frames.
 */
export function adjustFrame(
  frame: Frame,
  handle: FrameHandle,
  dx: number,
  dy: number,
  size: [number, number],
): Frame {
  let left = 0,
    top = 0,
    right = frame.width,
    bottom = frame.height;
  // Unrotated frames stop the moving edge at the scene border, so the
  // opposite edge stays put; rotated frames are clamped as a whole below.
  const aligned = frame.rotation % 360 === 0;
  const limit = (value: number, min: number, max: number) =>
    aligned ? Math.min(Math.max(value, min), max) : value;
  if (handle.includes("e"))
    right = Math.max(
      left + MIN_FRAME_SIZE,
      limit(right + dx, -Infinity, size[0] - frame.x),
    );
  if (handle.includes("w"))
    left = Math.min(
      right - MIN_FRAME_SIZE,
      limit(left + dx, -frame.x, Infinity),
    );
  if (handle.includes("s"))
    bottom = Math.max(
      top + MIN_FRAME_SIZE,
      limit(bottom + dy, -Infinity, size[1] - frame.y),
    );
  if (handle.includes("n"))
    top = Math.min(
      bottom - MIN_FRAME_SIZE,
      limit(top + dy, -frame.y, Infinity),
    );
  const width = right - left,
    height = bottom - top;
  const [cx, cy] = frameToScene(frame, [
    (left + right) / 2,
    (top + bottom) / 2,
  ]);
  return clampFrame(
    { ...frame, x: cx - width / 2, y: cy - height / 2, width, height },
    size,
  );
}
/** Pointer-driven resize: the handle follows the scene point. Grid snapping applies to unrotated frames. */
export function resizeFrame(
  frame: Frame,
  handle: FrameHandle,
  point: Point,
  size: [number, number],
  grid = 0,
): Frame {
  let target = point;
  if (grid > 0 && frame.rotation % 360 === 0)
    target = [snapToGrid(point[0], grid), snapToGrid(point[1], grid)];
  const local = sceneToFrame(frame, target);
  const dx = handle.includes("e")
    ? local[0] - frame.width
    : handle.includes("w")
      ? local[0]
      : 0;
  const dy = handle.includes("s")
    ? local[1] - frame.height
    : handle.includes("n")
      ? local[1]
      : 0;
  return adjustFrame(frame, handle, dx, dy, size);
}
const normalizeDegrees = (degrees: number) => {
  const turned = (((degrees % 360) + 540) % 360) - 180;
  return turned === -180 ? 180 : turned;
};
/** Relative rotation around the centre from the grab point to the current point. */
export function rotateFrame(
  frame: Frame,
  from: Point,
  to: Point,
  snap = 0,
): Frame {
  const [cx, cy] = frameCenter(frame);
  const angle = (p: Point) =>
    (Math.atan2(p[1] - cy, p[0] - cx) * 180) / Math.PI;
  let rotation = normalizeDegrees(frame.rotation + angle(to) - angle(from));
  if (snap > 0) rotation = normalizeDegrees(snapToGrid(rotation, snap));
  return { ...frame, rotation: rotation === 0 ? 0 : rotation };
}
export type Alignment =
  "left" | "center" | "right" | "top" | "middle" | "bottom";
const union = (rects: Rect[]): Rect => {
  const x = Math.min(...rects.map((r) => r.x)),
    y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((r) => r.x + r.width)) - x,
    height: Math.max(...rects.map((r) => r.y + r.height)) - y,
  };
};
/** Aligns visual bounds: to the scene for one frame, to the selection bounds for more. */
export function alignFrames(
  frames: Frame[],
  alignment: Alignment,
  size: [number, number],
): Frame[] {
  if (!frames.length) return [];
  const bounds = frames.map(frameBounds);
  const reference =
    frames.length === 1
      ? { x: 0, y: 0, width: size[0], height: size[1] }
      : union(bounds);
  return frames.map((frame, i) => {
    const b = bounds[i]!;
    const dx =
      alignment === "left"
        ? reference.x - b.x
        : alignment === "center"
          ? reference.x + reference.width / 2 - (b.x + b.width / 2)
          : alignment === "right"
            ? reference.x + reference.width - (b.x + b.width)
            : 0;
    const dy =
      alignment === "top"
        ? reference.y - b.y
        : alignment === "middle"
          ? reference.y + reference.height / 2 - (b.y + b.height / 2)
          : alignment === "bottom"
            ? reference.y + reference.height - (b.y + b.height)
            : 0;
    return moveFrame(frame, dx, dy, size);
  });
}
/** Equal gaps between visual bounds; the outermost frames stay. Needs three frames. */
export function distributeFrames(
  frames: Frame[],
  axis: "horizontal" | "vertical",
  size: [number, number],
): Frame[] {
  if (frames.length < 3) return frames.map((f) => ({ ...f }));
  const horizontal = axis === "horizontal";
  const items = frames.map((frame, index) => {
    const b = frameBounds(frame);
    return {
      index,
      start: horizontal ? b.x : b.y,
      length: horizontal ? b.width : b.height,
    };
  });
  const sorted = [...items].sort(
    (a, b) => a.start + a.length / 2 - (b.start + b.length / 2),
  );
  const first = sorted[0]!,
    last = sorted.at(-1)!;
  const span = last.start + last.length - first.start;
  const gap =
    (span - sorted.reduce((n, item) => n + item.length, 0)) /
    (sorted.length - 1);
  const result = frames.map((f) => ({ ...f }));
  let position = first.start;
  for (const item of sorted) {
    const delta = position - item.start;
    result[item.index] = moveFrame(
      frames[item.index]!,
      horizontal ? delta : 0,
      horizontal ? 0 : delta,
      size,
    );
    position += item.length + gap;
  }
  return result;
}
export type StackOrder = "forward" | "backward" | "front" | "back";
/** New z values for the selected frames; ties keep resolving by array order. */
export function stackFrames(
  frames: Frame[],
  selected: ReadonlySet<number>,
  order: StackOrder,
): number[] {
  const others = frames.filter((_, i) => !selected.has(i)).map((f) => f.z);
  const clamp = (z: number) => Math.min(1000, Math.max(-1000, z));
  return frames.map((frame, i) => {
    if (!selected.has(i)) return frame.z;
    if (order === "forward") return clamp(frame.z + 1);
    if (order === "backward") return clamp(frame.z - 1);
    if (!others.length) return frame.z;
    return order === "front"
      ? clamp(Math.max(frame.z, Math.max(...others) + 1))
      : clamp(Math.min(frame.z, Math.min(...others) - 1));
  });
}
/** Scene content point -> world point through the shared world matrix. */
export function sceneToWorld(
  document: ProjectDocument,
  sceneId: string,
  point: Point,
): Result<Vec3> {
  const world = getWorldMatrix(document, sceneId);
  if (!world.ok) return world;
  const scene = document.scenes.find((s) => s.id === sceneId)!;
  const m = world.value,
    x = point[0] - scene.size[0] / 2,
    y = point[1] - scene.size[1] / 2;
  return success([
    m[0]! * x + m[4]! * y + m[12]!,
    m[1]! * x + m[5]! * y + m[13]!,
    m[2]! * x + m[6]! * y + m[14]!,
  ]);
}
/** View matrix times the matrix from scene content coordinates to world. */
function contentView(
  document: ProjectDocument,
  sceneId: string,
  camera: CameraPose,
): Result<number[]> {
  const world = getWorldMatrix(document, sceneId);
  if (!world.ok) return world;
  const scene = document.scenes.find((s) => s.id === sceneId)!;
  const v = viewMatrix(camera),
    m = world.value,
    tx = -scene.size[0] / 2,
    ty = -scene.size[1] / 2;
  const a = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column++)
    for (let row = 0; row < 4; row++) {
      // Translation by the content origin folds into the last column.
      const mc = (r: number) =>
        column === 3
          ? m[r]! * tx + m[r + 4]! * ty + m[r + 12]!
          : m[column * 4 + r]!;
      a[column * 4 + row] =
        v[row]! * mc(0) +
        v[row + 4]! * mc(1) +
        v[row + 8]! * mc(2) +
        v[row + 12]! * mc(3);
    }
  return success(a);
}
/**
 * Scene content point -> document viewport pixels (origin top-left), with the
 * player's single perspective centred on the viewport.
 */
export function projectScenePoint(
  document: ProjectDocument,
  sceneId: string,
  camera: CameraPose,
  point: Point,
): Result<Point> {
  const view = contentView(document, sceneId, camera);
  if (!view.ok) return view;
  const a = view.value,
    p = document.settings.viewport.perspective,
    x = a[0]! * point[0] + a[4]! * point[1] + a[12]!,
    y = a[1]! * point[0] + a[5]! * point[1] + a[13]!,
    z = a[2]! * point[0] + a[6]! * point[1] + a[14]!;
  if (z >= p * 0.999999)
    return failure("PERSPECTIVE_PLANE", "Point is on or behind the eye plane");
  const s = p / (p - z);
  return success([
    document.settings.viewport.width / 2 + x * s,
    document.settings.viewport.height / 2 + y * s,
  ]);
}
/** Inverse of projectScenePoint: intersects the viewing ray with the scene plane. */
export function unprojectScenePoint(
  document: ProjectDocument,
  sceneId: string,
  camera: CameraPose,
  point: Point,
): Result<Point> {
  const view = contentView(document, sceneId, camera);
  if (!view.ok) return view;
  const a = view.value,
    p = document.settings.viewport.perspective,
    sx = point[0] - document.settings.viewport.width / 2,
    sy = point[1] - document.settings.viewport.height / 2;
  const m00 = p * a[0]! + sx * a[2]!,
    m01 = p * a[4]! + sx * a[6]!,
    m10 = p * a[1]! + sy * a[2]!,
    m11 = p * a[5]! + sy * a[6]!,
    r0 = sx * p - sx * a[14]! - p * a[12]!,
    r1 = sy * p - sy * a[14]! - p * a[13]!;
  const det = m00 * m11 - m01 * m10;
  // Relative test: an edge-on plane leaves only rounding noise in one row.
  const scale =
    (Math.abs(m00) + Math.abs(m01) + 1) * (Math.abs(m10) + Math.abs(m11) + 1);
  if (!Number.isFinite(det) || Math.abs(det) <= 1e-9 * scale)
    return failure("PARALLEL_PLANE", "The scene plane is edge-on");
  const u = (r0 * m11 - m01 * r1) / det,
    v = (m00 * r1 - r0 * m10) / det;
  if (a[2]! * u + a[6]! * v + a[14]! >= p * 0.999999)
    return failure("PERSPECTIVE_PLANE", "Point is on or behind the eye plane");
  return success([u, v]);
}
/** WCAG 2.x contrast ratio of two `#rrggbb` colours. */
export function contrastRatio(foreground: Color, background: Color): number {
  const luminance = (hex: Color) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export interface ContrastIssue {
  pointer: string;
  kind: "text" | "component";
  foreground: Color;
  background: Color;
  ratio: number;
  minimum: number;
}
/**
 * Palette pairs below 4.5:1 for text or 3:1 for the card border; colours are
 * reported, never corrected. Unknown palette IDs are a validation error instead.
 */
export function contrastIssues(document: ProjectDocument): ContrastIssue[] {
  const palette = new Map(document.theme.palette.map((p) => [p.id, p.value]));
  const colors = document.theme.colors;
  const issues: ContrastIssue[] = [];
  const check = (
    pointer: string,
    kind: ContrastIssue["kind"],
    foreground: string | undefined,
    background: string | undefined,
  ) => {
    if (!foreground || !background) return;
    const ratio = contrastRatio(foreground, background),
      minimum = kind === "text" ? 4.5 : 3;
    if (ratio < minimum)
      issues.push({ pointer, kind, foreground, background, ratio, minimum });
  };
  const text = palette.get(colors.text),
    background = palette.get(colors.background),
    backdrop = palette.get(colors.backdrop);
  check("/theme/colors/text", "text", text, background);
  check(
    "/theme/colors/accent",
    "component",
    palette.get(colors.accent),
    backdrop,
  );
  document.scenes.forEach((scene, i) => {
    const surface = scene.appearance.background
      ? palette.get(scene.appearance.background)
      : scene.appearance.variant === "card"
        ? background
        : backdrop;
    if (surface !== background)
      check(`/scenes/${i}/appearance`, "text", text, surface);
    scene.blocks.forEach((block, j) => {
      if (block.style?.color)
        check(
          `/scenes/${i}/blocks/${j}/style/color`,
          "text",
          palette.get(block.style.color),
          surface,
        );
    });
  });
  return issues;
}
export function contrastDiagnostics(document: ProjectDocument): Diagnostic[] {
  return contrastIssues(document).map((issue) => ({
    code: "LOW_CONTRAST",
    severity: "warning",
    pointer: issue.pointer,
    message: `Contrast ${issue.ratio.toFixed(2)}:1 is below ${issue.minimum}:1 for ${issue.kind}`,
  }));
}
