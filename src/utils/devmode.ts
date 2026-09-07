export const DEVMODE = import.meta.env.VITE_DEV_MODE === "true";

/**
 * The guided tour is switched off and unreachable from the UI.
 *
 * Nothing about it has been deleted: `startTour` still exists, <Tour /> is
 * still mounted in main.tsx, and the `tourReady` setting is still stored and
 * migrated. Flipping this back to true restores the Start Tour button and its
 * control in the Options panel.
 */
export const TOUR_ENABLED = false;
