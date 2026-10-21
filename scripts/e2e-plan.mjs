/** @param {string} platform @param {string} release */
export const isMacOS14 = (platform, release) =>
  platform === "darwin" && release.startsWith("23.");

/** @param {{ platform: string, release: string, args?: string[] }} input */
export function e2ePlan({ platform, release, args = [] }) {
  const mac14 = isMacOS14(platform, release);
  const dedicated = args.includes("--webkit-macos14");
  if (dedicated && !mac14) {
    throw new Error("The WebKit 1.61.1 runner is restricted to macOS 14");
  }
  const projects = [];
  const forwarded = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--webkit-macos14" || arg === "--install") continue;
    if (arg === "--project" || arg.startsWith("--project=")) {
      const name = arg === "--project" ? args[++i] : arg.slice(10);
      if (!["chromium", "firefox", "webkit"].includes(name)) {
        throw new Error(`Unknown project: ${name ?? "(missing)"}`);
      }
      projects.push(name);
    } else forwarded.push(arg);
  }
  if (dedicated && projects.some((name) => name !== "webkit")) {
    throw new Error("The dedicated runner only supports --project=webkit");
  }
  const selected = [
    ...new Set(
      projects.length
        ? projects
        : dedicated
          ? ["webkit"]
          : ["chromium", "firefox", "webkit"],
    ),
  ];
  const jobs = [];
  const current = selected.filter((name) => !mac14 || name !== "webkit");
  if (current.length)
    jobs.push({ profile: "current", version: "1.64.1", projects: current });
  if (mac14 && selected.includes("webkit"))
    jobs.push({
      profile: "webkit-macos14",
      version: "1.61.1",
      projects: ["webkit"],
    });
  return { jobs, forwarded };
}
