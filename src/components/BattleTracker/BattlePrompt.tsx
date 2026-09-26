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
  let message = "Please add a Monster with the Monster Manager.";
  if (heroCount === 0 && monsterCount === 0) message = "Please add a Hero and a Monster with the Managers.";
  else if (heroCount === 0) message = "Please add a Hero with the Hero Manager.";

  return <p id="battlePrompt">{message}</p>;
}
