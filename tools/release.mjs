/**
 * One command for a release: check, raise the version, commit it, deploy.
 *
 *   npm run release -- patch    fixes             0.4.1 -> 0.4.2
 *   npm run release -- minor    new features      0.4.2 -> 0.5.0
 *   npm run release -- major    the big one       0.9.3 -> 1.0.0
 *
 * Commit your work first: the release commit carries the new version and
 * nothing else. Before anything runs it shows the version it will make and
 * waits for a yes, because the level is an easy slip (0.5.0 was meant to be a
 * patch). Lint and tests run before the version is touched, so a failure
 * leaves nothing to undo. It doesn't push; that stays your call.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const LEVELS = { patch: "fixes", minor: "new features", major: "the big one" };

/**
 * What a level makes of an x.y.z version, as `npm version` would. Anything
 * else, a prerelease say, gets null rather than a guess.
 */
export function nextVersion(version, level) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  const [major, minor, patch] = match.slice(1).map(Number);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const sh = (command) => execSync(command, { stdio: "inherit" });
const read = (command) => execSync(command, { encoding: "utf8" }).trim();

/** One line from the terminal. Ctrl+C, or input that ends first, counts as no. */
function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.on("close", () => resolve(""));
    rl.on("SIGINT", () => rl.close());
    rl.question(question, (answer) => {
      resolve(answer);
      rl.close();
    });
  });
}

async function main() {
  const level = process.argv[2];
  if (!Object.hasOwn(LEVELS, level)) {
    console.error("Usage: npm run release -- patch | minor | major");
    return 1;
  }

  if (read("git status --porcelain")) {
    console.error("\nCommit or stash your changes first. The release commit carries the new version and nothing else.\n");
    return 1;
  }

  const current = JSON.parse(readFileSync("package.json", "utf8")).version;
  const version = nextVersion(current, level);
  if (!version) {
    console.error(`\npackage.json says ${current}, which isn't a plain x.y.z, so a ${level} release can't say what comes next.\n`);
    return 1;
  }

  console.log(`\nRelease ${current} → ${version} (${level}: ${LEVELS[level]})`);
  console.log(`It runs lint and the tests, commits "Release ${version}" and deploys it to production.`);
  const answer = await ask("Go ahead? (y/N) ");
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("\nStopped. Nothing was changed.\n");
    return 0;
  }

  sh("npm run lint");
  sh("npm test");

  /* The exact version that was agreed to, not the level again. */
  sh(`npm version ${version} --no-git-tag-version`);
  sh(`git commit -m "Release ${version}" -- package.json package-lock.json`);

  try {
    sh("npm run deploy -- --branch=production");
  } catch {
    console.error(
      `\nRelease ${version} is committed but didn't deploy. Fix the problem, then run:\n  npm run deploy -- --branch=production\n`,
    );
    return 1;
  }

  console.log(`\nReleased ${version}. Push when you're ready: git push\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
