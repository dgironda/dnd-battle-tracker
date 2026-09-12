import { conditionIcon } from "../../constants/StatusIcons";

interface ConditionMarkProps {
  name: string;
  /**
   * Show the name beside the mark. The chips do not — the tooltip names them,
   * and a row of chips is meant to be read at a glance — but the condition
   * reminder does, since that is where a DM learns which mark is which.
   */
  withName?: boolean;
  /**
   * Rounds held, when it is known. Null for a battle saved before any of this
   * was recorded — see utils/conditionRounds.ts.
   */
  rounds?: number | null;
}

/**
 * A condition, as its drawn mark, with how long it has been held.
 *
 * The name has not gone anywhere: it is in the tooltip that opens on hover, in
 * the picker that adds them, and in a hidden span here, because a mask carries
 * no text for a screen reader.
 *
 * The art is black line work, so it is painted as a MASK filled with
 * `currentColor` rather than dropped in as an image. That way it follows the
 * chip through its resting, hover and destructive-remove states instead of
 * staying black on a red ground — a background image can only be tinted by
 * filter, and no filter yields a chosen colour. The tracker's tick marks are
 * masks for the same reason.
 */
export default function ConditionMark({
  name,
  withName = false,
  rounds = null,
}: ConditionMarkProps) {
  const icon = conditionIcon(name);

  /* One is not a duration worth showing. Everything starts there, so a row of
     chips each carrying a "1" would be noise over the one thing the count is
     for: noticing that the rage has been running a while. */
  const count = rounds !== null && rounds >= 2 ? rounds : null;

  /* Nothing drawn for it — a custom condition, or one from a save older than
     the art. The word was a perfectly good chip and still is. */
  const showWord = withName || !icon;

  return (
    <>
      {icon && (
        <span
          className="conditionMark"
          /* The url() is QUOTED, which is not a style choice. Vite inlines a
             small SVG as a `data:image/svg+xml,...` URI with its `matrix(...)`
             transforms left as raw parens, and the first of those closes an
             unquoted url() early — the declaration is then invalid, the CSSOM
             drops it, and React writes no style attribute at all. The mark
             comes out as a solid square of currentColor, which is exactly what
             it did. Quoting survives both that and an ordinary file URL;
             JSON.stringify escapes anything awkward inside. Both spellings,
             since Safari still wants the prefixed one. */
          style={{
            WebkitMaskImage: `url(${JSON.stringify(icon)})`,
            maskImage: `url(${JSON.stringify(icon)})`,
          }}
          /* Which condition a mark is, without anyone reading a custom property
             back out of the CSSOM: handy in the inspector, and what the tests
             key off. */
          data-condition={name}
          aria-hidden="true"
        />
      )}

      {showWord ? (
        <span className={icon ? "conditionMarkName" : undefined}>{name}</span>
      ) : (
        /* The chips are icons on screen, so this is the whole of what a screen
           reader gets — name and duration together, as one phrase. */
        <span className="visuallyHidden">
          {count === null ? name : `${name}, held ${count} rounds`}
        </span>
      )}

      {count !== null &&
        (withName ? (
          /* In prose, words: a bare "3" beside "Exhausted" would read as a
             level rather than a count of rounds. */
          <span className="conditionRoundsWords">({count} rounds)</span>
        ) : (
          <>
            <span className="conditionRounds" aria-hidden="true">
              {count}
            </span>
            {showWord && <span className="visuallyHidden">, held {count} rounds</span>}
          </>
        ))}
    </>
  );
}
