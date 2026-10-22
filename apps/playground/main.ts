import { createPlayer } from "@spatialdeck/player";
import legacy from "../../examples/core-three-scenes/project.json";
import structure from "../../examples/structure-branching/project.json";
import "./style.css";
if (location.pathname.startsWith("/content"))
  await (await import("./content.js")).contentDemo();
else await legacyDemo();
async function legacyDemo() {
  const structured = location.pathname.startsWith("/structure");
  const project = structured ? structure : legacy;
  const players = [];
  for (let index = 0; index < 2; index++) {
    const section = document.createElement("section");
    section.className = "demo";
    const heading = document.createElement("h2");
    heading.textContent = `Player ${index + 1}`;
    const host = document.createElement("div");
    host.className = "player-host";
    host.id = `player-${index + 1}`;
    const controls = document.createElement("nav");
    controls.setAttribute("aria-label", `Controlli player ${index + 1}`);
    const player = createPlayer();
    players.push(player);
    for (const [label, action] of [
      ["Indietro", () => player.prev()],
      ["Avanti", () => player.next()],
      ["Prima scena", () => player.goTo({ nodeId: structured ? "A" : "n1" })],
      ["Terza scena", () => player.goTo({ nodeId: structured ? "D" : "n3" })],
      [
        "Riavvia percorso",
        () => player.setPath(structured ? "branch" : "main"),
      ],
    ] as const) {
      const button = document.createElement("button");
      button.textContent = label;
      button.addEventListener("click", () => void action());
      controls.append(button);
    }
    const input = document.createElement("input");
    input.placeholder = "Campo di prova tastiera";
    input.setAttribute("aria-label", `Test input ${index + 1}`);
    host.append(input);
    const status = document.createElement("output");
    player.on("scenechange", () => {
      status.textContent = player.getState().sceneId;
    });
    section.append(heading, controls, host, status);
    document.querySelector("#demos")!.append(section);
    const result = await player.mount(host, project);
    if (!result.ok) status.textContent = JSON.stringify(result.diagnostics);
    else status.textContent = player.getState().sceneId;
  }
  // Debug/demo handles; no global state exists in either library.
  Object.assign(window, {
    demoPlayers: players,
    createDemoPlayer: createPlayer,
    demoDocument: project,
  });
}
