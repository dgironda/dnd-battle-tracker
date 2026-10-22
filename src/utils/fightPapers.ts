import { getCampaignBattle } from "./LocalStorage";
import { createRoom, forgetRoom, linkFor, loadRoom, type PlayerRoom } from "./playerRoom";
import { toPlayerView, type PlayerView } from "./playerView";
import { RoomHost } from "./roomHost";
import { byInitiative } from "./turnOrder";

/**
 * Each campaign's initiative paper, kept up to date on its Battle Link room
 * for the sheets linked to the campaign.
 *
 * dmOS asks the bridge for a campaign's paper (getFightPaper) and sends the
 * link to every sheet linked to that campaign, which shows the page whenever a
 * fight is on. From then on, while dmOS is open, the paper follows the fight
 * however it changes: in BattleTracker's own window, which the bridge hears as
 * a storage event, or from dmOS itself, through the bridge.
 *
 * The room is the campaign's own, the one the Battle Manager shares, so a DM
 * who also hands the link out in Discord is showing the same paper. When that
 * room goes (stopped in the Battle Manager, or refused), dmOS is told and asks
 * again, and the next paper is a new room with a new link. That is how a DM
 * changes the link the sheets hold: stop sharing in the Battle Manager.
 */

/** A connection publishing one room: RoomHost, or a stand-in in the tests. */
export interface PaperHost {
  publish(view: PlayerView): void;
  /** Stop the room for everyone holding the link. */
  end(): void;
  close(): void;
}

/** Open a connection to `room`. `onGone` runs if the room ends or refuses the key. */
export type OpenHost = (room: PlayerRoom, onGone: () => void) => PaperHost;

const openRoomHost: OpenHost = (room, onGone) => {
  const host = new RoomHost(room, {
    onStatus: (status) => {
      if (status === "refused" || status === "ended") onGone();
    },
  });
  return {
    publish: (view) => host.publish(view),
    end: () => void host.end(),
    close: () => host.close(),
  };
};

/** The campaign's fight as its players should see it now. */
export function campaignPaper(campaignId: string): PlayerView {
  const battle = getCampaignBattle(campaignId);
  /* Whose turn it is, worked out as the tracker does: a position in
     initiative order, held inside the list. */
  const sorted = [...battle.combatants].sort(byInitiative);
  const acting = sorted.length ? sorted[Math.min(Math.max(battle.turnIndex, 0), sorted.length - 1)] : undefined;
  return toPlayerView(battle.combatants, battle.round, acting?.id ?? null);
}

export class FightPapers {
  /** The campaigns being kept up to date, each with the room it publishes to. */
  private readonly held = new Map<string, { code: string; host: PaperHost }>();

  constructor(
    /** A campaign's paper has a new link, or none: dmOS should ask again. */
    private readonly onLinkChanged: (campaignId: string) => void,
    private readonly openHost: OpenHost = openRoomHost,
  ) {}

  /** The campaign's paper link, making its room if it has none. Kept up to date from now on. */
  share(campaignId: string): string {
    const room = loadRoom(campaignId) ?? createRoom(campaignId);
    const held = this.held.get(campaignId);
    if (held?.code === room.code) {
      this.refresh(campaignId);
    } else {
      if (held) this.drop(campaignId);
      const host = this.openHost(room, () => this.gone(campaignId, room.code));
      this.held.set(campaignId, { code: room.code, host });
      host.publish(campaignPaper(campaignId));
    }
    return linkFor(room.code);
  }

  /** Bring a campaign's paper up to date, if it is being kept. A view players can't tell apart isn't sent. */
  refresh(campaignId: string): void {
    this.held.get(campaignId)?.host.publish(campaignPaper(campaignId));
  }

  /** The campaign's room changed in storage: shared afresh, or stopped, in the Battle Manager. */
  roomChanged(campaignId: string): void {
    const held = this.held.get(campaignId);
    if (!held || loadRoom(campaignId)?.code === held.code) return;
    this.drop(campaignId);
    this.onLinkChanged(campaignId);
  }

  /** The campaign is being deleted: its link stops working for every sheet that holds it. */
  forget(campaignId: string): void {
    this.held.get(campaignId)?.host.end();
    this.held.delete(campaignId);
  }

  /** The room ended or refused the key, so nothing can publish to it again. */
  private gone(campaignId: string, code: string): void {
    if (this.held.get(campaignId)?.code !== code) return;
    this.drop(campaignId);
    if (loadRoom(campaignId)?.code === code) forgetRoom(campaignId);
    this.onLinkChanged(campaignId);
  }

  private drop(campaignId: string): void {
    this.held.get(campaignId)?.host.close();
    this.held.delete(campaignId);
  }
}
