import type { ReactNode } from "react";
import { useRoomView } from "./useRoomView";
import { isRoomCode } from "../utils/roomCode";
import { turnCircleVariant } from "../utils/handArt";
import type { HpBand, PlayerCombatant, PlayerView } from "../utils/playerView";

/**
 * What the table sees.
 *
 * A different object from the DM's tracker on purpose: no managers, no
 * controls, nothing to click. It is a scrap of notepaper passed across the
 * table — read from three feet away, on a phone, in a dim room, by somebody
 * also holding dice. See player.css for how the paper is drawn.
 *
 * It is its own page (play.html) rather than a route inside the app, so a
 * player's phone loads a few kilobytes instead of the whole tracker, and the
 * page never touches the DM's rosters, settings or storage. All it knows about
 * the fight is what the room sends it.
 */

/** Said out loud, not in numbers. */
const BAND_LABEL: Record<HpBand, string> = {
  unharmed: "Unharmed",
  hurt: "Hurt",
  bloodied: "Bloodied",
  critical: "Barely standing",
  down: "Down",
};

function Row({ c }: { c: PlayerCombatant }) {
  /* Circled with the same scrawl the DM's tracker draws round this combatant
     (hashed from the id, so the two screens agree about the mark as well as
     about whose turn it is). */
  const turn = c.isCurrentTurn ? ` is-turn ${turnCircleVariant(c.id)}` : "";
  return (
    <li className={`pRow is-${c.type} hp-${c.hp}${turn}`}>
      <span className="pInit" aria-label="Initiative">{c.initiative}</span>

      <span className="pName">
        <span className="pNameText">{c.name}</span>
        {c.isCurrentTurn && <span className="pTurnMark" role="img" aria-label="Their turn" />}
      </span>

      {/* The band is the whole point: enough to know who is in trouble, never
          enough to count a boss down to the round it dies. The pencil stroke
          under it is drawn by the stylesheet. */}
      <span className="pHp">{BAND_LABEL[c.hp]}</span>

      {/* On the next line, and free to run on under the band. */}
      {c.conditions.length > 0 && (
        <span className="pConditions">
          {c.conditions.map((name) => (
            <span key={name} className="pCondition">{name}</span>
          ))}
        </span>
      )}
    </li>
  );
}

/** What the page says whenever there is no fight to draw. */
const NOTICE = {
  invalid: "That link doesn’t look right. Check it with your DM.",
  connecting: "Finding the battle…",
  unreachable: "Can’t reach the battle. Still trying…",
  ended: "Your DM has stopped sharing this battle.",
  waiting: "Waiting for your DM to start the battle.",
} as const;

export function PlayerPage({ code }: { code: string | null }) {
  const valid = isRoomCode(code);
  const state = useRoomView(valid ? code : null);

  if (!valid) return <Notice text={NOTICE.invalid} />;
  if (state.status !== "watching") return <Notice text={NOTICE[state.status]} />;
  return <Battle view={state.view} reconnecting={state.reconnecting} />;
}

function Notice({ text }: { text: string }) {
  return (
    <Shell>
      <p className="pMessage">{text}</p>
    </Shell>
  );
}

function Battle({ view, reconnecting }: { view: PlayerView | null; reconnecting: boolean }) {
  const combatants = view?.combatants ?? [];
  return (
    <Shell round={view?.round} reconnecting={reconnecting}>
      {combatants.length === 0 ? (
        <p className="pMessage">{NOTICE.waiting}</p>
      ) : (
        <>
          <ol className="pList">
            {combatants.map((c) => <Row key={c.id} c={c} />)}
          </ol>
          <footer className="pFoot">
            Hit points are shown as how hurt someone looks, not as numbers.
          </footer>
        </>
      )}
    </Shell>
  );
}

/** The desk, the scrap of paper on it, and the heading written at the top. */
function Shell({
  children,
  round,
  reconnecting,
}: {
  children: ReactNode;
  round?: number;
  reconnecting?: boolean;
}) {
  return (
    <main className="pDesk">
      <div className="pPaper">
        <article className="pSheet">
          <header className="pHead">
            <h1 className="pTitle">{round ? `Round ${round}` : "Battle"}</h1>
            {/* Said quietly and only when it matters — a player should not be
                watching a connection indicator during a fight. */}
            {reconnecting && <p className="pStale">Reconnecting&hellip;</p>}
          </header>

          {children}
        </article>
      </div>
    </main>
  );
}
