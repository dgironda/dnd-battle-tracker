/**
 * Stops a deploy that would put the wrong version on the site.
 *
 * It is the `predeploy` script, so `npm run deploy` runs it first and gives up
 * if it fails. It catches two mistakes, both of which have happened:
 *
 * - Uncommitted changes. A deploy builds this folder as it stands, but the
 *   About panel and crash reports name the last commit, so the site would
 *   claim to be code it is not.
 * - A version that is already live. The About panel shows package.json's
 *   version, and 0.4.0 once went out twice with different code in it.
 *
 * What is live comes from Cloudflare's own record of the latest production
 * deployment: its commit, and the version package.json had at that commit.
 * If that can't be read (offline, or a commit this clone doesn't have), the
 * deploy goes ahead with a warning rather than being blocked.
 *
 * To deploy anyway, for a preview say, set SKIP_RELEASE_CHECK=1.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Compare two x.y.z versions: negative if a is older, 0 if equal, positive if newer. */
export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Short hashes of the same commit can differ in length; either may be the longer. */
function sameCommit(a, b) {
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * The decision, apart from the git and wrangler calls so it can be tested.
 *
 * `live` is `{ commit, version }` for the latest production deployment, with
 * `version` null when this clone doesn't have that commit; `live` itself is
 * null when Cloudflare couldn't be asked.
 */
export function decideRelease({ dirtyFiles, version, head, live }) {
  if (dirtyFiles.length > 0) {
    const shown = dirtyFiles.slice(0, 12).map((line) => `  ${line}`);
    if (dirtyFiles.length > shown.length) shown.push(`  ...and ${dirtyFiles.length - shown.length} more`);
    return {
      ok: false,
      message: [
        "Not deploying: there are uncommitted changes.",
        "",
        ...shown,
        "",
        "A deploy builds this folder as it stands, but the About panel and crash",
        "reports name the last commit, so the site would claim to be code it isn't.",
        "Commit or stash these first. To deploy anyway, set SKIP_RELEASE_CHECK=1.",
      ].join("\n"),
    };
  }

  if (!live) {
    return {
      ok: true,
      message: `Deploying ${version} (build ${head}). Couldn't read what is live, so the version wasn't checked.`,
    };
  }

  if (sameCommit(live.commit, head)) {
    return { ok: true, message: `Redeploying ${version} (build ${head}), which is already live.` };
  }

  if (!live.version) {
    return {
      ok: true,
      message: `Deploying ${version} (build ${head}). Live is build ${live.commit}, which this clone doesn't have, so the version wasn't checked.`,
    };
  }

  if (compareVersions(version, live.version) <= 0) {
    return {
      ok: false,
      message: [
        `Not deploying: version ${version} is already live (build ${live.commit}), and this is a different build (${head}).`,
        "",
        "Raise the version first. The About panel shows it, so each release needs its own.",
        "  For fixes:         npm run release -- patch",
        "  For new features:  npm run release -- minor",
        "Each one raises the version, commits it and deploys.",
      ].join("\n"),
    };
  }

  return {
    ok: true,
    message: `Deploying ${version} (build ${head}). Live now: ${live.version} (build ${live.commit}).`,
  };
}

function run(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/** The latest production deployment's commit, and the version it had. */
function readLive(project) {
  try {
    const deployments = JSON.parse(
      run(`npx wrangler pages deployment list --project-name ${project} --environment production --json`),
    );
    const commit = deployments[0]?.Source;
    if (!commit) return null;
    let version = null;
    try {
      version = JSON.parse(run(`git show ${commit}:package.json`)).version ?? null;
    } catch {
      /* A commit this clone doesn't have. */
    }
    return { commit, version };
  } catch {
    return null;
  }
}

function main() {
  if (process.env.SKIP_RELEASE_CHECK === "1") {
    console.warn("Release check skipped (SKIP_RELEASE_CHECK=1).");
    return 0;
  }

  /* Not trimmed as a whole: each line's leading space is part of its status. */
  const dirtyFiles = execSync("git status --porcelain", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const version = JSON.parse(readFileSync("package.json", "utf8")).version;
  const head = run("git rev-parse --short HEAD");
  const project = readFileSync("wrangler.jsonc", "utf8").match(/"name"\s*:\s*"([^"]+)"/)?.[1];
  const live = dirtyFiles.length === 0 && project ? readLive(project) : null;

  const { ok, message } = decideRelease({ dirtyFiles, version, head, live });
  if (ok) console.log(message);
  else console.error(`\n${message}\n`);
  return ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
