/**
 * One command for a release: check, raise the version, commit it, deploy.
 *
 *   npm run release -- patch    fixes             0.4.1 -> 0.4.2
 *   npm run release -- minor    new features      0.4.2 -> 0.5.0
 *   npm run release -- major    the big one       0.9.3 -> 1.0.0
 *
 * Commit your work first: the release commit carries the new version and
 * nothing else. Lint and tests run before the version is touched, so a failure
 * leaves nothing to undo. It doesn't push; that stays your call.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LEVELS = ["patch", "minor", "major"];
const level = process.argv[2];

if (!LEVELS.includes(level)) {
  console.error("Usage: npm run release -- patch | minor | major");
  process.exit(1);
}

const sh = (command) => execSync(command, { stdio: "inherit" });
const read = (command) => execSync(command, { encoding: "utf8" }).trim();

if (read("git status --porcelain")) {
  console.error("\nCommit or stash your changes first. The release commit carries the new version and nothing else.\n");
  process.exit(1);
}

sh("npm run lint");
sh("npm test");

sh(`npm version ${level} --no-git-tag-version`);
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
sh(`git commit -m "Release ${version}" -- package.json package-lock.json`);

try {
  sh("npm run deploy -- --branch=production");
} catch {
  console.error(
    `\nRelease ${version} is committed but didn't deploy. Fix the problem, then run:\n  npm run deploy -- --branch=production\n`,
  );
  process.exit(1);
}

console.log(`\nReleased ${version}. Push when you're ready: git push\n`);
