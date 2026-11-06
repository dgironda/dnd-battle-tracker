import { inDmos } from "../../utils/dmos";

/*
 * Where each one gets added. BattleTracker's own managers, or in a dmOS window
 * dmOS's apps: its Hero Manager, and the Bestiary for monsters. BattleTracker's
 * rail is down to the gear there, so its managers aren't on screen to point at.
 */
const PROMPTS = {
  tracker: {
    both: "Please add a Hero and a Monster with the Managers.",
    hero: "Please add a Hero with the Hero Manager.",
    monster: "Please add a Monster with the Monster Manager.",
  },
  dmos: {
    both: "Please add a Hero with the Hero Manager and a Monster with the Bestiary.",
    hero: "Please add a Hero with the Hero Manager.",
    monster: "Please add a Monster with the Bestiary.",
  },
};

/**
 * What the page says before there is anything to fight with.
 *
 * Only asks for what is actually missing — telling someone with a full party
 * to add a hero is asking them to do something they have already done.
 *
 * No "on the left" either: the managers are a rail down the side of a wide
 * window and a row across the top of a portrait one, so the direction was
 * wrong on a phone. The buttons say what they are.
 */
export function BattlePrompt({ heroCount, monsterCount }: { heroCount: number; monsterCount: number }) {
  const prompts = inDmos() ? PROMPTS.dmos : PROMPTS.tracker;
  let message = prompts.monster;
  if (heroCount === 0 && monsterCount === 0) message = prompts.both;
  else if (heroCount === 0) message = prompts.hero;

  return <p id="battlePrompt">{message}</p>;
}
