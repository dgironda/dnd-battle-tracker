/**
 * Everything a shared battle needs, locally, from one command:
 *
 *   npm run dev:share
 *
 * Sharing takes three processes here because it takes three pieces of
 * Cloudflare in production:
 *
 *   rooms  wrangler dev        the BattleRoom Durable Object (workers/battle-rooms)
 *   api    wrangler pages dev  functions/api/room, bound to that Worker by name
 *   app    vite                the site itself, with hot reload
 *
 * Vite serves no Functions, so `npm run dev` on its own has nowhere to put a
 * room and the share button connects to a 404; vite.config.ts hands /api/room
 * to the pages dev server next door. Run the three by hand instead
 * (`npm run dev:rooms`, `npm run dev:api`, `npm run dev`) when you want one of
 * them in its own window with its own logs.
 *
 * Ctrl-C stops all three. On Windows that means killing each process tree:
 * wrangler runs the runtime (workerd) as a grandchild, and killing the shell
 * alone leaves it holding the port — a confusing five minutes the next time
 * you start.
 */

import { spawn } from "node:child_process";

const parts = [
  { name: "rooms", command: "npm run dev:rooms" },
  /* The api server finds the rooms Worker by name through wrangler's dev
     registry, so let the Worker register first. It would be picked up later
     anyway; this only saves the first connection being a 503. */
  { name: "api", command: "npm run dev:api", after: 1500 },
  { name: "app", command: "npm run dev" },
];

const children = [];
let stopping = false;

for (const part of parts) {
  if (part.after) await new Promise((done) => setTimeout(done, part.after));
  if (stopping) break;

  const child = spawn(part.command, {
    shell: true,
    /* No stdin on purpose: three of these share one terminal, and wrangler's
       interactive session and vite's shortcut keys would be fighting over the
       same keyboard. It also keeps wrangler to plain lines of output rather
       than a panel it redraws. */
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("exit", (code) => {
    if (code) process.exitCode = code;
    /* One down means the stack is half up, which is worse than down: the
       tracker would load and every room would fail. */
    stopAll(`${part.name} stopped`);
  });
  children.push(child);
}

console.log(`
  tracker      http://localhost:5173
  player view  http://localhost:5173/play/<code>
               or npm run dev:player, for a window of its own on :5174
  rooms api    http://127.0.0.1:8788  (proxied, nothing to open)

  Ctrl-C stops all of it.
`);

function stopAll(reason) {
  if (stopping) return;
  stopping = true;
  console.log(`\n  ${reason} — stopping the rest.\n`);
  for (const child of children) stop(child);
}

function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => stopAll("Ctrl-C"));
process.on("SIGTERM", () => stopAll("stopped"));
