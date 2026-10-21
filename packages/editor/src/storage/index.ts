import { serializeDocument, validateDocument } from "@spatialdeck/core";
import type { ProjectDocument } from "@spatialdeck/core";
export interface Revision {
  projectId: string;
  revision: number;
  updatedAt: number;
  document: ProjectDocument;
}
export class StorageConflict extends Error {
  constructor() {
    super(
      "Un’altra scheda ha salvato una revisione più recente. Salva una copia JSON del lavoro attivo.",
    );
  }
}
export class RecoveryRepository {
  private connection: Promise<IDBDatabase> | undefined;
  constructor(
    private open: () => IDBOpenDBRequest = () =>
      indexedDB.open("spatialdeck-studio", 1),
  ) {}
  private db() {
    return (this.connection ??= new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = this.open();
      } catch (e) {
        reject(e);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("documents", { keyPath: "projectId" });
        db.createObjectStore("recovery", {
          keyPath: ["projectId", "revision"],
        });
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Archivio occupato da un’altra scheda."));
    }));
  }
  async heads(): Promise<Revision[]> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("documents", "readonly");
      const req = tx.objectStore("documents").getAll();
      tx.oncomplete = () =>
        resolve(
          (req.result as Revision[]).sort((a, b) => b.updatedAt - a.updatedAt),
        );
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async revisions(projectId: string): Promise<Revision[]> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("recovery", "readonly");
      const req = tx
        .objectStore("recovery")
        .getAll(
          IDBKeyRange.bound(
            [projectId, 0],
            [projectId, Number.MAX_SAFE_INTEGER],
          ),
        );
      tx.oncomplete = () =>
        resolve(
          (req.result as Revision[]).sort((a, b) => b.revision - a.revision),
        );
      tx.onabort = () => reject(tx.error);
    });
  }
  async save(
    document: ProjectDocument,
    expectedRevision: number,
  ): Promise<Revision> {
    const validated = validateDocument(document);
    if (!validated.ok) throw new Error("Autosave: documento invalido.");
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["documents", "recovery"], "readwrite");
      let conflict = false;
      let writeError: unknown;
      const head = tx.objectStore("documents"),
        recovery = tx.objectStore("recovery");
      const request = head.get(document.id);
      const revision: Revision = {
        projectId: document.id,
        revision: expectedRevision + 1,
        updatedAt: Date.now(),
        document: validated.value,
      };
      request.onsuccess = () => {
        if (
          ((request.result as Revision | undefined)?.revision ?? 0) !==
          expectedRevision
        ) {
          conflict = true;
          tx.abort();
          return;
        }
        try {
          head.put(revision);
          recovery.put(revision);
          recovery.delete(
            IDBKeyRange.bound(
              [document.id, 0],
              [document.id, Math.max(0, revision.revision - 10)],
            ),
          );
        } catch (error) {
          writeError = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(revision);
      tx.onabort = () =>
        reject(
          conflict
            ? new StorageConflict()
            : (writeError ?? tx.error ?? new Error("Autosave interrotto.")),
        );
      tx.onerror = () => {};
    });
  }
  async close() {
    const connection = this.connection;
    this.connection = undefined;
    try {
      (await connection)?.close();
    } catch {
      /* Failed opens have no connection to close. */
    }
    this.connection = undefined;
  }
}
/** Serialized writes; the debounce is independent of React renders and storage latency. */
export class Autosave {
  private lastDocuments = new Map<string, string>();
  private key(document: ProjectDocument) {
    const result = serializeDocument(document);
    return result.ok ? result.value : "";
  }
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue = Promise.resolve();
  private stopped = false;
  constructor(
    private repository: RecoveryRepository,
    private revisions = new Map<string, number>(),
    private report: (message: string) => void = () => {},
  ) {}
  setRevision(projectId: string, revision: number, document?: ProjectDocument) {
    this.revisions.set(projectId, revision);
    if (document) this.lastDocuments.set(projectId, this.key(document));
  }
  schedule(document: ProjectDocument) {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush(document);
    }, 750);
  }
  flush(document: ProjectDocument) {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.queue = this.queue.then(async () => {
      if (
        this.stopped ||
        this.lastDocuments.get(document.id) === this.key(document)
      )
        return;
      try {
        const rev = await this.repository.save(
          document,
          this.revisions.get(document.id) ?? 0,
        );
        this.revisions.set(document.id, rev.revision);
        this.lastDocuments.set(document.id, this.key(document));
      } catch (e) {
        this.report(
          `Autosave non disponibile: ${String(e)} Il documento resta in memoria; usa Salva JSON.`,
        );
      }
    });
    return this.queue;
  }
  resume() {
    this.stopped = false;
  }
  cancelPending() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
  dispose() {
    this.stopped = true;
    this.cancelPending();
  }
}
