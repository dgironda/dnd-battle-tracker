import { promptDialog } from "../../utils/notify";

/**
 * End Battle: where Start the Battle sits while a fight runs.
 *
 * Ending a fight throws it away, so it takes a word typed rather than a click
 * that could land by accident mid-session. Any case will do: the typing is the
 * safeguard, not the capitals.
 *
 * Emily's red cutout button for now. A drawn ribbon to match Start the Battle
 * can take its place whenever there is one.
 */
export function EndBattleButton({ onEnd }: { onEnd: () => void }) {
  const confirmEnd = async () => {
    const typed = await promptDialog("Type END to end the current battle.", {
      title: "End the battle",
      tone: "warning",
      confirmLabel: "End Battle",
      placeholder: "END",
      maxLength: 10,
    });
    if (typed?.toUpperCase() === "END") onEnd();
  };

  return (
    <button
      type="button"
      id="buttonEndBattle"
      className="drawnBtn isCutout isRed"
      title="End this battle"
      onClick={() => void confirmEnd()}
    >
      End Battle
    </button>
  );
}
