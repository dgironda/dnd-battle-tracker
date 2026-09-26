import { usePlayerLinkContext, type PlayerLink } from '../../hooks/usePlayerLink';
import type { HostStatus } from '../../utils/roomHost';
import { notify, confirmDialog, promptDialog } from '../../utils/notify';

/**
 * The Battle Manager's "Your Players" section: sharing the live fight with the
 * table.
 *
 * Not to be confused with Share encounter under Your Data, which sends a set of
 * monsters for another DM to run. This one gives players a page that follows
 * the battle as it happens — see hooks/usePlayerLink.
 */

/** What the section says while a link is out. */
const STATUS: Record<HostStatus, string> = {
  connecting: "Connecting to your players' page…",
  live: 'Live: your players see changes as you make them.',
  offline: "Can't reach your players' page right now. Still trying…",
  /* A refused room is forgotten in the same moment (usePlayerLink), so this is
     never on screen — `lost` says what happened instead. */
  refused: '',
  /* Only visible for the instant between the room confirming and the link
     being forgotten. */
  ended: 'Stopping…',
};

/**
 * Let the table watch the fight: open a room if there is not one, and put its
 * link on the clipboard. One button for both, because they are one intention —
 * a DM who has not shared yet does not want a room, they want a link in their
 * hand. Pressed again later, it copies the same link.
 */
async function share(link: PlayerLink) {
  const url = link.share();
  try {
    await navigator.clipboard.writeText(url);
    await notify(
      "Paste it wherever your players are. Their page shows the turn order, conditions and " +
        "how hurt everyone looks, and changes as you run the fight — never hit point numbers, " +
        "and never a monster you've hidden.",
      { title: 'Player link copied' },
    );
  } catch {
    /* No clipboard (a refused permission, an older browser): hand the link over
       in a box it can be copied out of instead. */
    await promptDialog('Copy this link and send it to your players.', {
      title: "Your players' link",
      initial: url,
      confirmLabel: 'Done',
    });
  }
}

/** The link stops working for everyone holding it. */
async function stop(link: PlayerLink) {
  const ok = await confirmDialog(
    "Your players' page stops updating and the link stops working. Sharing again gives out a new link.",
    { title: 'Stop sharing?', tone: 'danger', confirmLabel: 'Stop sharing', cancelLabel: 'Keep sharing' },
  );
  if (ok) await link.stop();
}

function Note({ link }: { link: PlayerLink }) {
  if (link.room && link.status) {
    return (
      <>
        {STATUS[link.status]}{' '}
        <button type="button" className="playerLinkStop" onClick={() => stop(link)}>
          Stop sharing
        </button>
      </>
    );
  }
  if (link.lost) return <>Your last player link stopped working. Share again for a new one.</>;
  return (
    <>
      Copies a link your players can keep open on their phones: turn order, conditions and how
      hurt everyone looks, updated as you play.
    </>
  );
}

export default function ShareWithPlayers() {
  const link = usePlayerLinkContext();
  /* Rendered outside the app's PlayerLinkProvider — a test mounting just the
     Battle Manager — there is nothing to share with. */
  if (!link) return null;

  return (
    <div id="shareWithPlayers">
      <h3>Your Players</h3>
      <div className="dataRow">
        <button type="button" className="drawnBtn isCutout isGreen" onClick={() => share(link)}>
          Share encounter with players
        </button>
        <span className="dataNote" aria-live="polite">
          <Note link={link} />
        </span>
      </div>
    </div>
  );
}
