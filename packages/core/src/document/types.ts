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
  layout: "flow" | "canvas";
  appearance: SceneAppearance;
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
export type TextBlock = {
  id: Id;
  type: "text";
  data: { text: string };
  frame?: Frame;
  style?: BlockStyle;
};
export type MarkdownBlock = {
  id: Id;
  type: "markdown";
  data: { source: string };
  frame?: Frame;
  style?: BlockStyle;
};
export type HtmlBlock = {
  id: Id;
  type: "html";
  data: { source: string };
  frame?: Frame;
  style?: BlockStyle;
};
export type SvgBlock = {
  id: Id;
  type: "svg";
  data: { source: string; alt: string };
  frame?: Frame;
  style?: BlockStyle;
};
export type LatexBlock = {
  id: Id;
  type: "latex";
  data: { source: string; display: boolean; alt: string };
  frame?: Frame;
  style?: BlockStyle;
};
export type ImageBlock = {
  id: Id;
  type: "image";
  data: { assetId: Id; alt: string; fit: "contain" | "cover" };
  frame?: Frame;
  style?: BlockStyle;
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
  frame?: Frame;
  style?: BlockStyle;
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
  frame?: Frame;
  style?: BlockStyle;
};
export type LinkBlock = {
  id: Id;
  type: "link";
  data: { label: string; target: { pathId: Id; nodeId: Id } };
  frame?: Frame;
  style?: BlockStyle;
};
export type EmbedBlock = {
  id: Id;
  type: "embed";
  data: { url: string; title: string };
  frame?: Frame;
  style?: BlockStyle;
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
  frame?: Frame;
  style?: BlockStyle;
};
export type PaletteId = Id;
export type Color = string;
export type FontId =
  "system-sans" | "system-serif" | "system-mono" | "atkinson-hyperlegible";
export type Theme = {
  palette: Array<{ id: PaletteId; value: Color }>;
  colors: {
    text: PaletteId;
    background: PaletteId;
    accent: PaletteId;
    backdrop: PaletteId;
  };
  fonts: { body: FontId; heading: FontId };
  typeScale: { body: number; title: number };
};
export type SceneAppearance = {
  variant: "card" | "plain";
  background: PaletteId | null;
  titleVisible: boolean;
};
export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z: number;
};
export type BlockStyle = {
  align?: "start" | "center" | "end" | "justify";
  verticalAlign?: "start" | "center" | "end";
  size?: "xs" | "s" | "m" | "l" | "xl" | "xxl";
  color?: PaletteId;
};
export type ProjectDocument = {
  schemaVersion: "1.3.0";
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
  requiredCapabilities: Array<"linear" | "structure" | "blocks" | "layout">;
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
  theme: Theme;
};
