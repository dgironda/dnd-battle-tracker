import { conditionIcon } from "../../constants/StatusIcons";

interface ConditionMarkProps {
  name: string;
  /**
   * Show the name beside the mark. The chips do not — the tooltip names them,
   * and a row of chips is meant to be read at a glance — but the condition
   * reminder does, since that is where a DM learns which mark is which.
   */
  withName?: boolean;
}

/**
 * A condition, as its drawn mark.
 *
 * The name has not gone anywhere: it is in the tooltip that opens on hover, in
 * the picker that adds them, and in a hidden span here, because a mask carries
 * no text for a screen reader to read.
 *
 * The art is black line work, so it is painted as a MASK filled with
 * `currentColor` rather than dropped in as an image. That way it follows the
 * chip through its resting, hover and destructive-remove states instead of
 * staying black on a red ground — a background image can only be tinted by
 * filter, and no filter yields a chosen colour. The tracker's tick marks are
 * masks for the same reason.
 */
export default function ConditionMark({ name, withName = false }: ConditionMarkProps) {
  const icon = conditionIcon(name);

  /* Nothing drawn for it — a custom condition, or one from a save older than
     the art. The word was a perfectly good chip and still is. */
  if (!icon) return <>{name}</>;

  return (
    <>
      {/* `data-condition` says which mark this is without anyone having to read
          a custom property back out of the CSSOM: handy in the inspector, and
          what the tests key off. */}
      <span
        className="conditionMark"
        /* The url() is QUOTED, which is not a style choice. Vite inlines a
            small SVG as a `data:image/svg+xml,...` URI with its `matrix(...)`
            transforms left as raw parens, and the first of those closes an
            unquoted url() early — the declaration is then invalid, the CSSOM
            drops it, and React writes no style attribute at all. The mark comes
            out as a solid square of currentColor, which is exactly what it did.
            Quoting survives both that and an ordinary file URL; JSON.stringify
            escapes anything awkward inside. Both spellings, since Safari still
            wants the prefixed one. */
        style={{
          WebkitMaskImage: `url(${JSON.stringify(icon)})`,
          maskImage: `url(${JSON.stringify(icon)})`,
        }}
        data-condition={name}
        aria-hidden="true"
      />
      <span className={withName ? "conditionMarkName" : "visuallyHidden"}>{name}</span>
    </>
  );
}
