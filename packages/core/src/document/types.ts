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
export type Block =
  | TextBlock
  | MarkdownBlock
  | HtmlBlock
  | SvgBlock
  | LatexBlock
  | ImageBlock
  | AudioBlock
  | VideoBlock
  | LinkBlock
  | EmbedBlock
  | PluginBlock;
export type Scene = {
  id: Id;
  title: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  size: [Size, Size];
  visible: boolean;
  blocks: Array<Block>;
  notes: string;
  extensions: Extensions;
  parentId: Id | null;
};
export type Asset = {
  id: Id;
  path: string;
  mime: string;
  byteLength: number;
  sha256?: string;
};
export type PathNode = {
  id: Id;
  sceneId: Id;
  holdMs: number;
  camera?: AuthoredCameraPose;
};
export type PathEdge = {
  id: Id;
  from: Id;
  to: Id;
  label: string;
  transition: Transition;
  cameraTrackId?: Id;
  condition?: EdgeCondition;
};
export type ScenePath = {
  id: Id;
  name: string;
  startNodeId: Id | null;
  nodes: Array<PathNode>;
  edges: Array<PathEdge>;
  loopPolicy?: { maxVisitsPerNode: number };
};
export type AuthoredCameraPose = {
  position: Vec3;
  rotation: Vec3;
  zoom: number;
};
export type CameraKeyframe = { at: number; pose: AuthoredCameraPose };
export type CameraTrack = {
  id: Id;
  keyframes: Array<CameraKeyframe>;
  interpolation: "linear" | "cubic";
  easing: "linear" | "ease-in-out";
};
export type EdgeCondition =
  { kind: "manual" } | { kind: "visit-limit"; maxVisits: number };
export type Cue = {
  id: Id;
  edgeId: Id;
  atMs: number;
  event: string;
  payload: JsonValue;
};
export type TextBlock = { id: Id; type: "text"; data: { text: string } };
export type MarkdownBlock = {
  id: Id;
  type: "markdown";
  data: { source: string };
};
export type HtmlBlock = { id: Id; type: "html"; data: { source: string } };
export type SvgBlock = {
  id: Id;
  type: "svg";
  data: { source: string; alt: string };
};
export type LatexBlock = {
  id: Id;
  type: "latex";
  data: { source: string; display: boolean; alt: string };
};
export type ImageBlock = {
  id: Id;
  type: "image";
  data: { assetId: Id; alt: string; fit: "contain" | "cover" };
};
export type AudioBlock = {
  id: Id;
  type: "audio";
  data: {
    assetId: Id;
    label: string;
    autoplay: boolean;
    loop: boolean;
    onExit: "pause" | "stop";
  };
};
export type VideoBlock = {
  id: Id;
  type: "video";
  data: {
    assetId: Id;
    label: string;
    autoplay: boolean;
    loop: boolean;
    onExit: "pause" | "stop";
    alt: string;
    posterAssetId?: Id;
    captionsAssetId?: Id;
  };
};
export type LinkBlock = {
  id: Id;
  type: "link";
  data: { label: string; target: { pathId: Id; nodeId: Id } };
};
export type EmbedBlock = {
  id: Id;
  type: "embed";
  data: { url: string; title: string };
};
export type PluginBlock = {
  id: Id;
  type: "plugin";
  data: {
    pluginId: string;
    apiVersion: "1.0.0";
    dataVersion: string;
    payload: JsonValue;
  };
};
export type ProjectDocument = {
  schemaVersion: "1.2.0";
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
  requiredCapabilities: Array<"linear" | "structure" | "blocks">;
  scenes: Array<Scene>;
  assets: Array<Asset>;
  paths: Array<ScenePath>;
  defaultPathId: Id | null;
  extensions: Extensions;
  cameraTracks: Array<CameraTrack>;
  cues: Array<Cue>;
  pluginSettings?: {
    [key: string]: {
      apiVersion: "1.0.0";
      dataVersion: string;
      data: JsonValue;
    };
  };
};
