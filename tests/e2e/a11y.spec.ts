import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./runner.js";
import { studioURL, writeEvidence } from "./evidence.js";

const axeSource = readFile(
  createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  "utf8",
);
// axe is injected as a script; the pages keep their own CSP otherwise.
test.use({ bypassCSP: true });
interface AxeResult {
  id: string;
  impact: string | null;
  help: string;
  nodes: Array<{ target: string[] }>;
}
/**
 * Motivated exceptions: none are needed today. Each entry must name the rule,
 * the selector it applies to and why the finding is a false positive.
 */
const exceptions: Array<{ rule: string; target: RegExp; reason: string }> = [];
async function audit(
  page: Page,
  name: string,
  info: { project: { name: string } },
) {
  await page.addScriptTag({ content: await axeSource });
  const results = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: unknown,
          ) => Promise<{ violations: AxeResult[]; passes: unknown[] }>;
        };
      }
    ).axe;
    const run = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: [
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22aa",
          "best-practice",
        ],
      },
      resultTypes: ["violations"],
    });
    return {
      violations: run.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target })),
      })),
    };
  });
  const severe = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      ...v,
      nodes: v.nodes.filter(
        (n) =>
          !exceptions.some(
            (e) => e.rule === v.id && e.target.test(n.target.join(" ")),
          ),
      ),
    }))
    .filter((v) => v.nodes.length);
  await writeEvidence(`axe/${info.project.name}-${name}.json`, results);
  expect(
    severe.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} → ${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 5)
          .join(", ")}`,
    ),
  ).toEqual([]);
}
for (const route of ["/core", "/structure", "/content"])
  test(`axe: playground ${route} has no serious or critical violations`, async ({
    page,
  }, info) => {
    await page.goto(route);
    await expect(page.locator(".sd-player")).toHaveCount(2);
    await expect(
      page
        .locator('.sd-block [role="status"]')
        .filter({ hasText: "Caricamento risorsa locale" }),
    ).toHaveCount(0);
    await audit(page, route.slice(1), info);
    await page.getByRole("button", { name: "Vista testuale" }).first().click();
    await audit(page, `${route.slice(1)}-outline`, info);
  });
test("axe: Studio empty, with content and dialogs has no serious or critical violations", async ({
  page,
}, info) => {
  await page.goto(studioURL);
  await expect(page.locator(".preview-player .sd-player")).toHaveCount(1);
  await audit(page, "studio-empty", info);
  await page
    .getByLabel("File progetto JSON")
    .setInputFiles("examples/content-gallery/content-gallery.spatialdeck");
  await expect(
    page.getByRole("list", { name: "Elenco scene" }).locator("li"),
  ).toHaveCount(11);
  await page
    .getByRole("list", { name: "Elenco scene" })
    .getByRole("button")
    .nth(7)
    .click();
  await audit(page, "studio-content", info);
  await page.getByRole("button", { name: "Elimina scena" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "studio-dialog", info);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annulla" })
    .click();
  await page.getByRole("button", { name: "Presenta ↗" }).click();
  await expect(page.locator(".presentation-player .sd-player")).toHaveCount(1);
  await audit(page, "studio-presentation", info);
});
