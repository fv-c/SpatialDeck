import { afterEach, expect, it, vi } from "vitest";
import {
  Autosave,
  RecoveryRepository,
  StorageConflict,
} from "../src/storage/index.js";
import { emptyProject } from "../src/commands/index.js";
import type { Revision } from "../src/storage/index.js";
import type { ProjectDocument } from "@spatialdeck/core";
afterEach(() => vi.useRealTimers());
it("denied IndexedDB reports a failure instead of replacing the document", async () => {
  const repository = new RecoveryRepository(() => {
    throw new Error("denied");
  });
  await expect(repository.save(emptyProject(), 0)).rejects.toThrow("denied");
  await repository.close();
});
it("autosave debounces at 750ms, serializes revisions and disposes timers", async () => {
  vi.useFakeTimers();
  const saved: number[] = [];
  class Repo extends RecoveryRepository {
    override async save(
      document: ProjectDocument,
      revision: number,
    ): Promise<Revision> {
      saved.push(revision);
      return {
        projectId: document.id,
        revision: revision + 1,
        updatedAt: 0,
        document,
      };
    }
  }
  const autosave = new Autosave(new Repo()),
    document = emptyProject();
  autosave.schedule(document);
  await vi.advanceTimersByTimeAsync(749);
  expect(saved).toEqual([]);
  autosave.schedule(document);
  await vi.advanceTimersByTimeAsync(750);
  expect(saved).toEqual([0]);
  document.metadata.title = "changed";
  await autosave.flush(document);
  expect(saved).toEqual([0, 1]);
  autosave.schedule(document);
  autosave.dispose();
  await vi.advanceTimersByTimeAsync(1000);
  expect(saved).toEqual([0, 1]);
});
it.each([new Error("QuotaExceededError"), new StorageConflict()])(
  "storage failure keeps manual serialization available: %s",
  async (error) => {
    class Repo extends RecoveryRepository {
      override async save(): Promise<Revision> {
        throw error;
      }
    }
    const warnings: string[] = [];
    const document = emptyProject(),
      autosave = new Autosave(new Repo(), new Map(), (m) => warnings.push(m));
    await autosave.flush(document);
    expect(warnings[0]).toContain("Salva JSON");
    expect(document.schemaVersion).toBe("1.1.0");
    autosave.dispose();
  },
);
