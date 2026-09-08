import { usePlayerPoll } from "./usePlayerPoll";
import { isRoomCode } from "../utils/roomCode";
import type { HpBand, PlayerCombatant } from "../utils/playerView";
import "./player.css";

/**
 * What the table sees.
 *
 * A different object from the DM's tracker on purpose: no managers, no
 * controls, no plaques, nothing to click. It is the card passed across the
 * table — read from three feet away, on a phone, in a dim room, by somebody
 * who is also holding dice.
 *
 * It mounts on its own (see main.tsx) rather than inside the app, so it never
 * touches the DM's rosters, settings or storage. The only thing it knows about
 * the fight is what the server hands it.
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
  return (
    <li className={`pRow is-${c.type} hp-${c.hp}${c.isCurrentTurn ? " is-turn" : ""}`}>
      <span className="pInit" aria-label="Initiative">{c.initiative}</span>

      <span className="pMain">
        <span className="pName">
          {c.isCurrentTurn && <span className="pTurnMark" aria-hidden="true">▶</span>}
          {c.name}
        </span>

        {c.conditions.length > 0 && (
          <span className="pConditions">
            {c.conditions.map((name) => (
              <span key={name} className="pCondition">{name}</span>
            ))}
          </span>
        )}
      </span>

      {/* The band is the whole point: enough to know who is in trouble, never
          enough to count a boss down to the round it dies. */}
      <span className="pHp">
        <span className="pHpBar" aria-hidden="true"><i /></span>
        <span className="pHpLabel">{BAND_LABEL[c.hp]}</span>
      </span>
    </li>
  );
}

export function PlayerPage({ code }: { code: string }) {
  const state = usePlayerPoll(code);

  if (!isRoomCode(code)) {
    return (
      <Shell>
        <p className="pMessage">That link doesn&rsquo;t look right. Check it with your DM.</p>
      </Shell>
    );
  }

  if (state.status === "loading") {
    return <Shell><p className="pMessage">Finding the battle&hellip;</p></Shell>;
  }

  if (state.status === "missing") {
    return (
      <Shell>
        <p className="pMessage">
          No battle here. Either your DM has stopped sharing, or this link has expired.
        </p>
      </Shell>
    );
  }

  if (state.status === "unreachable") {
    return (
      <Shell>
        <p className="pMessage">Can&rsquo;t reach the battle. Still trying&hellip;</p>
      </Shell>
    );
  }

  const { view, stale } = state;

  return (
    <Shell round={view.round} stale={stale}>
      {view.combatants.length === 0 ? (
        <p className="pMessage">Nobody is in this battle yet.</p>
      ) : (
        <ol className="pList">
          {view.combatants.map((c) => <Row key={c.id} c={c} />)}
        </ol>
      )}
    </Shell>
  );
}

function Shell({
  children,
  round,
  stale,
}: {
  children: React.ReactNode;
  round?: number;
  stale?: boolean;
}) {
  return (
    <main className="pPage">
      <header className="pHead">
        <h1 className="pTitle">{round ? `Round ${round}` : "Battle"}</h1>
        {/* Said quietly and only when it matters — a player should not be
            watching a connection indicator during a fight. */}
        {stale && <p className="pStale">Reconnecting&hellip;</p>}
      </header>

      {children}

      <footer className="pFoot">
        Hit points are shown as how hurt someone looks, not as numbers.
      </footer>
    </main>
  );
}
