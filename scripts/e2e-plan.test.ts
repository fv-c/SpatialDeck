import { expect, it } from "vitest";
import { e2ePlan, isMacOS14 } from "./e2e-plan.mjs";

it("routes the Linux CI matrix exclusively to 1.64.1, including WebKit", () => {
  expect(e2ePlan({ platform: "linux", release: "6.8.0" }).jobs).toEqual([
    {
      profile: "current",
      version: "1.64.1",
      projects: ["chromium", "firefox", "webkit"],
    },
  ]);
});
it("routes macOS 14 Chromium/Firefox to current and WebKit to the dedicated runner", () => {
  expect(e2ePlan({ platform: "darwin", release: "23.6.0" }).jobs).toEqual([
    {
      profile: "current",
      version: "1.64.1",
      projects: ["chromium", "firefox"],
    },
    { profile: "webkit-macos14", version: "1.61.1", projects: ["webkit"] },
  ]);
});
it.each(["24.0.0", "25.0.0", "26.0.0"])(
  "keeps newer macOS %s on 1.64.1",
  (release) => {
    expect(e2ePlan({ platform: "darwin", release }).jobs).toEqual([
      {
        profile: "current",
        version: "1.64.1",
        projects: ["chromium", "firefox", "webkit"],
      },
    ]);
  },
);
it("runs an explicit WebKit filter only on the macOS 14 runner and preserves test filters", () => {
  expect(
    e2ePlan({
      platform: "darwin",
      release: "23.6.0",
      args: ["--project", "webkit", "--grep", "CSP"],
    }),
  ).toEqual({
    jobs: [
      { profile: "webkit-macos14", version: "1.61.1", projects: ["webkit"] },
    ],
    forwarded: ["--grep", "CSP"],
  });
});
it("never runs the compatibility runner for a Chromium-only request", () => {
  expect(
    e2ePlan({
      platform: "darwin",
      release: "23.6.0",
      args: ["--project=chromium"],
    }).jobs,
  ).toEqual([
    { profile: "current", version: "1.64.1", projects: ["chromium"] },
  ]);
});
it("supports a dedicated installation/test command without adding other browsers", () => {
  expect(
    e2ePlan({
      platform: "darwin",
      release: "23.6.0",
      args: ["--webkit-macos14", "--install"],
    }).jobs,
  ).toEqual([
    { profile: "webkit-macos14", version: "1.61.1", projects: ["webkit"] },
  ]);
});
it("rejects the dedicated runner on Linux and rejects incompatible project filters", () => {
  expect(() =>
    e2ePlan({
      platform: "linux",
      release: "6.8.0",
      args: ["--webkit-macos14"],
    }),
  ).toThrow("restricted to macOS 14");
  expect(() =>
    e2ePlan({
      platform: "darwin",
      release: "23.6.0",
      args: ["--webkit-macos14", "--project=firefox"],
    }),
  ).toThrow("only supports");
});
it.each([["--project=unknown"], ["--project"]])(
  "rejects invalid project selectors %s",
  (...args) => {
    expect(() =>
      e2ePlan({ platform: "linux", release: "6.8.0", args }),
    ).toThrow("Unknown project");
  },
);
it("recognizes Darwin 23 only, and retains browser dependency installation flags", () => {
  expect(isMacOS14("linux", "23.0.0")).toBe(false);
  expect(isMacOS14("darwin", "230.0.0")).toBe(false);
  expect(
    e2ePlan({
      platform: "linux",
      release: "6.8.0",
      args: ["--install", "--with-deps"],
    }).forwarded,
  ).toEqual(["--with-deps"]);
});
