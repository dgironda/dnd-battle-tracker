/**
 * The Worker that hosts shared battles.
 *
 * It exists only to carry the BattleRoom Durable Object: a Pages project cannot
 * define one, so the class lives here and the site reaches it through the
 * BATTLE_ROOMS binding in the root wrangler.jsonc. Nothing is served from this
 * Worker directly — every connection arrives through the site's
 * functions/api/room route — so its own fetch handler turns everything away.
 *
 * Deploy with `npm run deploy:rooms`. It only needs redeploying when
 * server/battleRoom.ts or server/roomLogic.ts change.
 */
export { BattleRoom } from "../../server/battleRoom";

export default {
  fetch(): Response {
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler;
