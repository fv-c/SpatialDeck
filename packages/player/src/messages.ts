import type { AssetErrorCode } from "./assets/index.js";
/**
 * Every user-visible string of the player and of the builtin renderers.
 * Hosts replace any subset through `PlayerOptions.messages`; the defaults are
 * Italian. Functions receive document data as plain text and must return
 * plain text: the player always inserts messages with textContent.
 */
export interface PlayerMessages {
  /** BCP 47 language of these strings, applied as `lang` to player controls and status texts. */
  lang: string;
  /** Accessible name of the player when the document has no title. */
  presentation: string;
  outline: string;
  reduceMotion: string;
  overview: string;
  camera: string;
  sceneView: string;
  panLeft: string;
  panRight: string;
  panUp: string;
  panDown: string;
  zoomIn: string;
  zoomOut: string;
  enableMedia: string;
  stage: string;
  emptyPath: string;
  emptyPresentation: string;
  choices: string;
  choicePrompt: string;
  choiceDisabled(label: string, reason: string): string;
  visitLimit(limit: number, nodeId: string): string;
  contentUnavailable(type: string): string;
  contentError(detail: string): string;
  pluginContent(pluginId: string): string;
  formulaInvalid(text: string): string;
  mediaLoading: string;
  mediaPlay(label: string): string;
  mediaRejected: string;
  mediaDecodeError: string;
  imageDecodeError: string;
  assetMissing(assetId: string): string;
  assetInvalid(
    assetId: string,
    reason: Exclude<AssetErrorCode, "missing" | "aborted">,
  ): string;
  embedUnauthorized: string;
  embedDisabled: string;
  embedConsent(title: string): string;
  embedOffline: string;
  embedActive: string;
  embedRevoke: string;
  embedRevoked: string;
  pluginUnavailable(pluginId: string, dataVersion: string): string;
  pluginOffline: string;
}
export const defaultMessages: Readonly<PlayerMessages> = Object.freeze({
  lang: "it",
  presentation: "SpatialDeck",
  outline: "Vista testuale",
  reduceMotion: "Riduci movimento",
  overview: "Panoramica",
  camera: "Camera",
  sceneView: "Vista scena",
  panLeft: "Pan sinistra",
  panRight: "Pan destra",
  panUp: "Pan alto",
  panDown: "Pan basso",
  zoomIn: "Zoom +",
  zoomOut: "Zoom −",
  enableMedia: "Abilita media",
  stage: "Presentazione spaziale",
  emptyPath: "Nessuna scena nel percorso selezionato.",
  emptyPresentation: "Presentazione vuota",
  choices: "Scelte del percorso",
  choicePrompt: "Scegli il percorso",
  choiceDisabled: (label: string, reason: string) => `${label} — ${reason}`,
  visitLimit: (limit: number, nodeId: string) =>
    `Limite di ${limit} visite raggiunto per ${nodeId}`,
  contentUnavailable: (type: string) => `Contenuto non disponibile (${type})`,
  contentError: (detail: string) => `Errore contenuto: ${detail}`,
  pluginContent: (pluginId: string) => `Plugin: ${pluginId}`,
  formulaInvalid: (text: string) => `Formula non valida: ${text}`,
  mediaLoading: "Caricamento risorsa locale…",
  mediaPlay: (label: string) => `Riproduci ${label}`,
  mediaRejected:
    "Riproduzione rifiutata o codec non supportato. Usa Riproduci o associa un file compatibile.",
  mediaDecodeError:
    "Media non decodificabile o codec non supportato. Associa un file compatibile.",
  imageDecodeError: "Immagine non decodificabile. Associa un file compatibile.",
  assetMissing: (assetId: string) =>
    `Risorsa mancante: ${assetId}. Associa il file nel pannello Risorse.`,
  assetInvalid: (assetId: string, reason: "size" | "signature" | "digest") =>
    `Risorsa non valida: ${assetId}. ${
      reason === "size"
        ? "La dimensione non corrisponde al registro."
        : reason === "digest"
          ? "Digest errato."
          : "MIME o firma incoerenti."
    } Associa un file compatibile.`,
  embedUnauthorized:
    "Embed disattivato: origine non autorizzata dall’host. Offline non disponibile.",
  embedDisabled: "Contenuto web esterno disattivato. Richiede rete e consenso.",
  embedConsent: (title: string) => `Consenti embed: ${title}`,
  embedOffline: "Embed non disponibile offline.",
  embedActive:
    "Embed isolato, script disabilitati. Rimuovi consenso per chiuderlo.",
  embedRevoke: "Rimuovi consenso embed",
  embedRevoked: "Embed disattivato.",
  pluginUnavailable: (pluginId: string, dataVersion: string) =>
    `Plugin assente o incompatibile: ${pluginId} (${dataVersion}). Dati conservati.`,
  pluginOffline: "Plugin non disponibile offline; dati conservati.",
});
/** Known keys only, so a host object cannot add or shadow unrelated properties. */
export function resolveMessages(
  overrides: Partial<PlayerMessages> = {},
): Readonly<PlayerMessages> {
  const merged: Record<string, unknown> = { ...defaultMessages };
  for (const [key, value] of Object.entries(overrides))
    if (
      value !== undefined &&
      Object.hasOwn(defaultMessages, key) &&
      typeof value === typeof defaultMessages[key as keyof PlayerMessages]
    )
      merged[key] = value;
  return Object.freeze(merged as unknown as PlayerMessages);
}
