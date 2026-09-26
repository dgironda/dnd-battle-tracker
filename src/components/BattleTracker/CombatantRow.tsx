import type { Dispatch, SetStateAction } from "react";
import type { Combatant, Hero, Monster } from "../../types/index";
import { EditableCell } from "../../utils/Utils";
import {
  checkboxStyle,
  checkboxVariant,
  turnCircleVariant,
  underlineStyle,
  underlineVariant,
} from "../../utils/handArt";
import { CROSS_OUT_SLAIN_MONSTERS } from "../../utils/experiments";
import { HeroStatBlockHover } from "./HeroStatBlockHover";
import { MonsterStatBlockHover } from "./MonsterStatBlockHover";
import { ConditionsEditor } from "./ConditionsEditor";
import type { UpdateCombatant } from "./useCombatantEdits";
import HeartIcon from "../../assets/draftsvgs_v2/icon_hp.svg";
import TempHpIcon from "../../assets/draftsvgs_v2/icon_temphp.svg";

/**
 * Build the Monster shape the hover card expects from a combatant row.
 * This used to be a 40-line IIFE inlined in the JSX, re-running for every
 * monster on every render.
 */
function combatantToMonster(c: Combatant): Monster {
  return {
    id: c.id,
    name: c.name,
    link: c.link ?? "",
    hp: c.currHp,
    maxHp: c.maxHp,
    currHp: c.currHp,
    ac: c.ac,
    str: c.str,
    dex: c.dex,
    con: c.con,
    int: c.int,
    wis: c.wis,
    cha: c.cha,
    pp: c.pp,
    init: c.init,
    hidden: false,
    present: true,
    conditions: c.conditions ?? [],
  };
}

/** How red the HP plaque goes: parchment at full health to #880808 at none. */
function hpTint(currHp: number, maxHp: number): string {
  // At full health the plaque shows through untouched. Painting parchment
  // over parchment would otherwise leave a faint rectangle wherever the two
  // tones did not match exactly.
  if (maxHp === 0 || currHp >= maxHp) return "transparent";

  const percentage = Math.max(0, Math.min(1, currHp / maxHp));

  // Start colour: the parchment, in both themes. It used to follow the theme
  // (#484c51 in dark), which made sense when the row was a themed table cell
  // — but the row is drawn artwork now and the artwork does not follow the
  // theme, so dark mode ramped from a dark grey sitting on a light plaque.
  const [startR, startG, startB] = [0xf8, 0xf2, 0xeb];
  // End color: #880808 (0% HP)
  const [endR, endG, endB] = [0x88, 0x08, 0x08];

  const mix = (start: number, end: number) =>
    Math.round(end + (start - end) * percentage)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(startR, endR)}${mix(startG, endG)}${mix(startB, endB)}`;
}

const ACTION_CELLS: { key: "action" | "bonus" | "move" | "reaction"; cls: string; label: string }[] = [
  { key: "action", cls: "combatantAction", label: "A" },
  { key: "bonus", cls: "combatantBonus", label: "B" },
  { key: "move", cls: "combatantMove", label: "M" },
  { key: "reaction", cls: "combatantReaction", label: "R" },
];

interface CombatantRowProps {
  combatant: Combatant;
  /** The roster hero behind a hero row — undefined if deleted mid-battle. */
  hero: Hero | undefined;
  isCurrent: boolean;
  roundNumber: number;
  conditionDescriptions: Record<string, string>;
  editingField: string | null;
  setEditingField: Dispatch<SetStateAction<string | null>>;
  isEditingConditions: boolean;
  /** Which combatant's conditions are being edited; null for none. */
  setEditingConditions: (id: string | null) => void;
  updateCombatant: UpdateCombatant;
  addCondition: (combatantId: string, condition: string) => void;
  removeCondition: (combatantId: string, condition: string) => void;
  onOpenHp: (combatantId: string) => void;
}

/** One combatant's row in the battle tracker. */
export function CombatantRow({
  combatant,
  hero,
  isCurrent,
  roundNumber,
  conditionDescriptions,
  editingField,
  setEditingField,
  isEditingConditions,
  setEditingConditions,
  updateCombatant,
  addCondition,
  removeCondition,
  onOpenHp,
}: CombatantRowProps) {
  const isDead = combatant.conditions.includes("Dead");
  const isDying = combatant.conditions.includes("Death Saves");

  /* EXPERIMENT: cross out the slain (see utils/experiments.ts).
     Monsters only — a hero on 0 is unconscious and rolling death
     saves, and crossing them off would say they are gone when the
     party can still reach them. Delete this const and the
     `slainClass` below to remove. */
  const isSlain =
    CROSS_OUT_SLAIN_MONSTERS &&
    combatant.type === "monster" &&
    (isDead || combatant.currHp <= 0);
  const slainClass = isSlain ? " isSlain" : "";

  return (
    <tr
      role="row"
      className={`combatantInfo${isCurrent ? ` isCurrentTurn ${turnCircleVariant(combatant.id)}` : ""}${slainClass}`}
    >
      <td role="cell" className={`combatantName ${underlineVariant(combatant.id)}`} style={underlineStyle(combatant.id)}>
        {isCurrent && <span className="currentTurnIndicator" aria-hidden="true" />}

        {combatant.type === "hero" ? (
          // hero may be undefined if they were deleted mid-battle;
          // HeroStatBlockHover handles that and falls back to the
          // combatant's own data.
          <HeroStatBlockHover hero={hero} combatant={combatant}>
            <span className={`combatantNameText${isDead ? " strike" : ""}`} title={combatant.name}>{combatant.name}</span>
          </HeroStatBlockHover>
        ) : combatant.type === "monster" ? (
          /* EXPERIMENT: a slain monster has no stat panel. There
             is nothing left to look up, and the panel is a large
             sheet that slides over the rows still fighting — so
             the one row you no longer care about was the easiest
             one to open by accident. The name stays clickable-
             looking nowhere: no trigger, no underline, no
             pointer. */
          isSlain ? (
            <span className="combatantNameText strike" title={combatant.name}>{combatant.name}</span>
          ) : (
            <MonsterStatBlockHover
              monster={combatantToMonster(combatant)}
              currentHp={combatant.currHp}
              updateCombatant={updateCombatant}
            >
              <span className={`combatantNameText${isDead ? " strike" : ""}`} title={combatant.name}>{combatant.name}</span>
            </MonsterStatBlockHover>
          )
        ) : (
          <span className="combatantNameText" title={combatant.name}>{combatant.name}</span>
        )}
      </td>

      <td role="cell" className="combatantInit">
        <span title="Initiative">
          <EditableCell
            entity={combatant}
            field="initiative"
            type="number"
            editingField={editingField}
            setEditingField={setEditingField}
            updateEntity={updateCombatant}
          />
        </span>
      </td>

      <td
        role="cell"
        className="combatantHP"
        style={{
          /* A custom property, not backgroundColor: the tint is
             painted by the button inside the cell, not by the
             cell — see .combatantHP in fixes/battle-table.css for why. */
          ["--hp-tint" as string]: hpTint(combatant.currHp, combatant.maxHp),
          // Healthy HP inherits the table's own ink, so it
          // matches initiative exactly. Only a bloodied cell
          // overrides it, because by then the cell's ground has
          // gone dark red and that ink no longer reads on it.
          color:
            combatant.currHp < combatant.maxHp * 0.5
              ? "var(--color-hpbloodied)"
              : undefined,
        }}
      >
        {/* A button, like the initiative cell: it picks up the
            same face, padding and hover, and unlike the click
            handler that used to sit on the <td> it can be
            reached from the keyboard. */}
        <button
          type="button"
          className="setEditingField hpButton"
          onClick={() => onOpenHp(combatant.id)}
          title="Click to change HP"
        >
          {combatant.tHp > 0 && (
            <span className="thp">
              {/* The same drawn shield the HP window uses — this
                  was the only emoji left in the tracker. */}
              <img src={TempHpIcon} alt="" aria-hidden="true" className="thpIcon" />
              {combatant.tHp}
            </span>
          )}
          <span className="hpValue">
            {combatant.currHp} / {combatant.maxHp}
          </span>
          <img src={HeartIcon} alt="" aria-hidden="true" className="hpHeart" />
        </button>
      </td>

      {/* The drawn box and the drawn tick are separate elements: the
          tick is wiped in as if being drawn, and a mask on the input
          itself would have taken the box with it. The cell carries the
          variant and the per-instance tilt so both inherit them. */}
      {ACTION_CELLS.map(({ key, cls, label }) => (
        <td
          role="cell"
          className={`${cls} ${checkboxVariant(combatant.id, key)}`}
          style={checkboxStyle(combatant.id, key)}
          key={key}
        >
          <input
            type="checkbox"
            id={`${combatant.id}-${key}`}
            checked={combatant[key]}
            disabled={isDead || isDying}
            onChange={(e) => updateCombatant(combatant.id, key, e.target.checked)}
          />
          <span className="tickMark" aria-hidden="true" />
          <label htmlFor={`${combatant.id}-${key}`} className="checkOverlay">
            {label}
          </label>
        </td>
      ))}

      <td role="cell" className="combatantConditions">
        <ConditionsEditor
          combatant={combatant}
          roundNumber={roundNumber}
          isEditing={isEditingConditions}
          conditionDescriptions={conditionDescriptions}
          onStartEditing={setEditingConditions}
          onStopEditing={() => setEditingConditions(null)}
          onAdd={addCondition}
          onRemove={removeCondition}
        />
      </td>
    </tr>
  );
}
