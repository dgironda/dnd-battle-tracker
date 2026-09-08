import { groupByRound, describe, timeOf, type LogEntry } from "../../utils/battleLog";

interface BattleLogDialogProps {
  log: LogEntry[];
  onClose: () => void;
}

/**
 * What has happened, newest round first.
 *
 * It wears the Edit Battle window's frame classes rather than its own copy of
 * them: the two open from buttons sitting side by side and should read as the
 * same object, and duplicating forty lines of border-image to achieve that
 * would guarantee they drift apart.
 */
export function BattleLogDialog({ log, onClose }: BattleLogDialogProps) {
  const rounds = groupByRound(log);

  return (
    <div className="editBattleOuter" role="presentation" onClick={onClose}>
      <div
        className="editBattleInner battleLogInner"
        role="dialog"
        aria-modal="true"
        aria-label="Battle log"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Battle Log</h3>

        {rounds.length === 0 ? (
          <p className="editBattleEmpty">Nothing has happened yet.</p>
        ) : (
          <ol className="battleLogRounds">
            {rounds.map((group) => (
              <li key={group.round} className="battleLogRound">
                <h4 className="battleLogRoundHead">
                  Round {group.round}
                  {/* A round with nothing in it is worth showing — it means
                      everybody missed, which is itself the answer to "how did
                      we get here". */}
                  {group.entries.length === 0 && (
                    <span className="battleLogQuiet"> — nothing happened</span>
                  )}
                </h4>

                {group.entries.length > 0 && (
                  <ul className="battleLogEntries">
                    {group.entries.map((entry) => (
                      <li key={entry.id} className={`battleLogEntry is-${entry.kind}`}>
                        <time className="battleLogTime" dateTime={new Date(entry.at).toISOString()}>
                          {timeOf(entry)}
                        </time>
                        <span className="battleLogText">{describe(entry)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}

        <div className="editBattleActions">
          <button type="button" className="editBattleDone" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
