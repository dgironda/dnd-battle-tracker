import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Which release is this? package.json's "version", which the About panel
 * shows. Raising it is the release step — `npm version patch` (or `minor`)
 * with `--no-git-tag-version` changes package.json and the lockfile and
 * commits nothing.
 */
function appVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
      version?: string
    }
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Which build is this?
 *
 * A crash report without it is a report we cannot place: "it broke" against an
 * unknown commit is barely more use than "it broke". Cloudflare Pages hands the
 * SHA over in the environment; a local `wrangler pages deploy` does not, so we
 * ask git. Neither is guaranteed, and neither is worth failing a build over.
 */
function buildId(): string {
  const fromPages = process.env.CF_PAGES_COMMIT_SHA
  if (fromPages) return fromPages.slice(0, 7)
  try {
    const git = (args: string) =>
      execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    const head = git('rev-parse --short HEAD')
    /* Built from uncommitted changes: say so, or the About panel and crash
       reports name a commit this build is not. `npm run deploy` refuses to
       ship one (tools/check-release.mjs). */
    return git('status --porcelain') ? `${head}-dirty` : head
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [react()],
  build: {
    outDir: 'dist',  // MUST be exactly 'dist'
  },
})
