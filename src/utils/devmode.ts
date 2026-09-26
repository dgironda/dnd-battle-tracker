/**
 * Dev mode: the Patreon gate and analytics off (everyone gets the perks), and
 * extra logging.
 *
 * Never in a production build, whatever the env files say. `.env` turns it on,
 * and `vite build` reads `.env` as well — so on the flag alone, one missing
 * line in `.env.production` would ship a build that gives the supporter perks
 * away to every visitor. `import.meta.env.DEV` is false in every `vite build`
 * (and so in `vite preview`), which rules that out.
 */
export const DEVMODE = import.meta.env.DEV && import.meta.env.VITE_DEV_MODE === "true";

/**
 * The guided tour is switched off and unreachable from the UI.
 *
 * Nothing about it has been deleted: `startTour` still exists, <Tour /> is
 * still mounted in main.tsx, and the `tourReady` setting is still stored and
 * migrated. Flipping this back to true restores the Start Tour button and its
 * control in the Options panel.
 */
export const TOUR_ENABLED = false;
