import type { Diagnostic } from "../document/index.js";
import type { Visit } from "../navigation/index.js";
export interface PlayerEvents {
  documentchange: { instanceId: string };
  ready: { instanceId: string };
  navigationstart: { instanceId: string; transitionId: string; to: Visit };
  navigationcancel: { instanceId: string; transitionId: string };
  scenechange: { instanceId: string; transitionId: string; visit: Visit };
  navigationend: { instanceId: string; transitionId: string };
  choice: { instanceId: string; choices: Choice[] };
  diagnostic: { instanceId: string; diagnostic: Diagnostic };
  destroy: { instanceId: string };
}
export interface Choice {
  edgeId: string;
  label: string;
  disabledReason?: string;
}
export type EventSink = <K extends keyof PlayerEvents>(
  name: K,
  event: PlayerEvents[K],
) => void;
