import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Connect, type Plugin } from 'vite'
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

/**
 * Serve play.html at /play/<code> from Vite's own servers.
 *
 * In production public/_redirects does this. Without it here, the dev and
 * preview servers fall back to index.html for any unknown path, and a player
 * link opened locally shows the DM's tracker instead of the player page.
 */
function playerRoute(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url && /^\/play\/[^/?#]+\/?(?:[?#].*)?$/.test(req.url)) req.url = '/play.html'
    next()
  }
  return {
    name: 'player-route',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

/**
 * Where a shared battle's WebSocket goes while developing.
 *
 * Vite serves none of our Cloudflare Functions, so /api/room has nowhere to
 * land here and the share button would connect to a 404. `npm run dev:api`
 * runs the real function next door — wrangler pages dev, against the rooms
 * Worker from `npm run dev:rooms` — and this hands room traffic to it, so the
 * tracker keeps hot reload and the player link still works. `npm run dev:share`
 * starts all three at once.
 *
 * Only /api/room, not /api wholesale: the Patreon routes want secrets this
 * machine does not have, and failing the way they already do in dev is clearer
 * than failing in a new way.
 *
 * changeOrigin is left off on purpose. The function admits only this site's own
 * pages, by comparing the Origin header against its own host; keeping the
 * browser's Host header means both still say localhost:5173 on the far side.
 */
const roomsProxy = {
  '/api/room': { target: 'http://127.0.0.1:8788', ws: true, changeOrigin: false },
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [react(), playerRoute()],
  server: { proxy: roomsProxy },
  preview: { proxy: roomsProxy },
  build: {
    outDir: 'dist',  // MUST be exactly 'dist'
    rollupOptions: {
      /* Three pages: the tracker; the player page a shared battle's link
         opens, its own entry so a player's phone loads only its own page; and
         bridge.html, the page dmOS loads to reach BattleTracker's storage. */
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        play: fileURLToPath(new URL('./play.html', import.meta.url)),
        bridge: fileURLToPath(new URL('./bridge.html', import.meta.url)),
      },
    },
  },
})
