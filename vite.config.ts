import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [react()],
  build: {
    outDir: 'dist',  // MUST be exactly 'dist'
  },
})
