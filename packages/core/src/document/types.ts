// Generated from schema; edit the schema, then pnpm generate.
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Id = string;
export type Coordinate = number;
export type Size = number;
export type Vec3 = [Coordinate, Coordinate, Coordinate];
export type Transition = {
  durationMs: number;
  easing: "linear" | "ease-in-out";
};
export type Extensions = {
  [key: string]: { version: string; data: JsonValue };
};
export type TextBlock = { id: Id; type: "text"; data: { text: string } };
export type Scene = {
  id: Id;
  title: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  size: [Size, Size];
  visible: boolean;
  blocks: Array<TextBlock>;
  notes: string;
  extensions: Extensions;
};
export type Asset = {
  id: Id;
  path: string;
  mime: string;
  byteLength: number;
  sha256?: string;
};
export type PathNode = { id: Id; sceneId: Id; holdMs: number };
export type PathEdge = {
  id: Id;
  from: Id;
  to: Id;
  label: string;
  transition: Transition;
};
export type ScenePath = {
  id: Id;
  name: string;
  startNodeId: Id | null;
  nodes: Array<PathNode>;
  edges: Array<PathEdge>;
};
export type ProjectDocument = {
  schemaVersion: "1.0.0";
  id: Id;
  metadata: {
    title: string;
    language: string;
    author?: string;
    description?: string;
  };
  settings: {
    viewport: { width: Size; height: Size; perspective: number };
    presentation: {
      fit: "contain";
      motion: "system" | "reduced";
      defaultTransition: Transition;
    };
  };
  requiredCapabilities: Array<"linear">;
  scenes: Array<Scene>;
  assets: Array<Asset>;
  paths: Array<ScenePath>;
  defaultPathId: Id | null;
  extensions: Extensions;
};
