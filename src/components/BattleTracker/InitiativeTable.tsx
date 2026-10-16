import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import InitIcon from "../../assets/draftsvgs_v2/icon_init.svg";
import { baseMonsterName } from "../../utils/monsterNaming";
import { formatModifier, parseInitiative, rollInitiative } from "../../utils/initiative";

/** One combatant waiting on an initiative. */
export interface InitiativeEntry {
  id: string;
  name: string;
  type: "hero" | "monster";
  /** Their initiative modifier: what Roll adds to the d20. */
  modifier: number;
  /** For a hero, who plays them: the name a DM calls across the table. */
  player?: string;
}

interface InitiativeTableProps {
  /**
   * Everyone joining the fight, in the order to list them. Each inner list is
   * one row, or, for several monsters of one kind, a group: a row that sets
   * them all at once, then a row for each of them.
   */
  groups: InitiativeEntry[][];
  /** Everyone's initiative by id. Anyone left blank has been rolled for. */
  onSubmit: (initiatives: Record<string, number>) => void;
  onCancel: () => void;
}

const inputId = (key: string) => `initTable-${key}`;

/** The modifier column. A flat 0 still shows, so the column has no holes. */
const modifierText = (modifier: number) => formatModifier(modifier) || "+0";

/**
 * Manual mode: everyone's initiative in one table.
 *
 * The one-at-a-time prompt asks for each combatant in turn and cannot move on
 * without an answer, so one player away from the table held up the start of
 * the whole fight. Here the totals go in as they are called out, in any order.
 * Anyone still blank when the battle starts is rolled for, and their total can
 * be corrected on the tracker once they are back.
 *
 * Enter moves to the next BLANK box rather than the next box, because the
 * point is to step past whoever is not there. Once nothing is blank it moves
 * to Start Battle.
 */
export function InitiativeTable({ groups, onSubmit, onCancel }: InitiativeTableProps) {
  const entries = useMemo(() => groups.flat(), [groups]);
  const [values, setValues] = useState<Record<string, string>>({});
  const startRef = useRef<HTMLButtonElement>(null);

  /* Escape backs out of starting the battle, as it does from the single
     prompt. A click outside does not: here it would throw away a whole
     table of totals. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const raw = (id: string) => values[id] ?? "";
  const isBlank = (id: string) => parseInitiative(raw(id)) === null;
  const blanks = entries.filter((e) => isBlank(e.id)).length;

  const setAll = (ids: string[], value: string) =>
    setValues((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = value;
      return next;
    });

  /* The dice are rolled out here rather than inside a state update, because
     an update can run twice and would roll twice. */
  const rollFor = (group: InitiativeEntry[]) =>
    setAll(
      group.map((e) => e.id),
      String(rollInitiative(group[0].modifier)),
    );

  const rollTheRest = () => {
    const next = { ...values };
    for (const e of entries) {
      if (isBlank(e.id)) next[e.id] = String(rollInitiative(e.modifier));
    }
    setValues(next);
  };

  const start = () => {
    const initiatives: Record<string, number> = {};
    for (const e of entries) {
      initiatives[e.id] = parseInitiative(raw(e.id)) ?? rollInitiative(e.modifier);
    }
    onSubmit(initiatives);
  };

  /** Enter: the next blank box from `from`, round to the top if need be. */
  const focusNextBlank = (from: number, skip?: string) => {
    for (let step = 0; step < entries.length; step++) {
      const e = entries[(from + step) % entries.length];
      if (e.id !== skip && isBlank(e.id)) {
        document.getElementById(inputId(e.id))?.focus();
        return;
      }
    }
    startRef.current?.focus();
  };

  const onEnter = (from: number, skip?: string) => (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    focusNextBlank(from, skip);
  };

  const entryRow = (entry: InitiativeEntry, index: number, inGroup: boolean) => (
    <tr key={entry.id} className={`initRow is-${entry.type}${inGroup ? " is-member" : ""}`}>
      <th scope="row">
        <label htmlFor={inputId(entry.id)} className="initName">
          {entry.name}
        </label>
        {entry.player && <span className="initPlayer">{entry.player}</span>}
      </th>
      <td className="initMod">{modifierText(entry.modifier)}</td>
      <td className="initTotal">
        <input
          id={inputId(entry.id)}
          type="number"
          value={raw(entry.id)}
          placeholder="–"
          aria-label={`Initiative for ${entry.name}`}
          onChange={(e) => setAll([entry.id], e.target.value)}
          onKeyDown={onEnter(index + 1, entry.id)}
          autoFocus={index === 0}
        />
      </td>
      <td className="initRoll">
        <button
          type="button"
          className="initRollOne"
          title={`Roll 1d20 ${formatModifier(entry.modifier)} for ${entry.name}`}
          aria-label={`Roll for ${entry.name}`}
          onClick={() => rollFor([entry])}
        >
          <img src={InitIcon} alt="" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );

  /* ---------------------------------------------------------------------
     EXPERIMENT: group initiative (see utils/experiments.ts)

     Several monsters of one kind get a row of their own above them: a total
     typed or rolled there goes to all of them, which is the one-at-a-time
     prompt's "one roll for all". Each still has its own box underneath, for
     tables that roll them separately. Groups only reach this window while
     the experiment is on.
     --------------------------------------------------------------------- */
  const groupRow = (group: InitiativeEntry[], firstIndex: number) => {
    const kind = baseMonsterName(group[0].name);
    const first = raw(group[0].id);
    const shared = group.every((e) => raw(e.id) === first) ? first : "";
    const mixed = shared === "" && group.some((e) => raw(e.id) !== "");
    const key = `group-${group[0].id}`;
    return (
      <tr key={key} className="initGroupRow is-monster">
        <th scope="row">
          <label htmlFor={inputId(key)} className="initName">
            {kind}
          </label>
          <span className="initGroupCount">one roll for all {group.length}</span>
        </th>
        <td className="initMod">{modifierText(group[0].modifier)}</td>
        <td className="initTotal">
          <input
            id={inputId(key)}
            type="number"
            value={shared}
            placeholder={mixed ? "mixed" : "all"}
            aria-label={`Initiative for every ${kind}`}
            onChange={(e) =>
              setAll(
                group.map((g) => g.id),
                e.target.value,
              )
            }
            onKeyDown={onEnter(firstIndex)}
          />
        </td>
        <td className="initRoll">
          <button
            type="button"
            className="initRollOne"
            title={`Roll 1d20 ${formatModifier(group[0].modifier)} once, for every ${kind}`}
            aria-label={`Roll once for every ${kind}`}
            onClick={() => rollFor(group)}
          >
            <img src={InitIcon} alt="" aria-hidden="true" />
          </button>
        </td>
      </tr>
    );
  };
  /* --- EXPERIMENT: group initiative ends here ---------------------------- */

  /* Heroes and monsters in a body each, so the two sides of the fight read
     as two blocks. Every row knows its place in `entries` for Enter. */
  const heroRows: ReactNode[] = [];
  const monsterRows: ReactNode[] = [];
  let index = 0;
  for (const group of groups) {
    const rows = group[0].type === "hero" ? heroRows : monsterRows;
    if (group.length > 1) rows.push(groupRow(group, index));
    for (const entry of group) {
      rows.push(entryRow(entry, index, group.length > 1));
      index++;
    }
  }

  const note =
    blanks === 0
      ? "Everyone has a total."
      : `${blanks} still blank: ${blanks === 1 ? "they'll" : "they'll all"} be rolled for when you start.`;

  return (
    <div className="initTableOuter" role="presentation">
      <div
        className="initTableInner initiativeDialogInner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="initTableTitle"
      >
        <h3 id="initTableTitle">Roll for Initiative</h3>
        <p className="initTableIntro">
          Type each total as it's called out, in any order, or roll for anyone who isn't here.
        </p>

        <table className="initTable">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col" title="Initiative modifier, added when you roll">
                Mod
              </th>
              <th scope="col">Total</th>
              <th scope="col">Roll</th>
            </tr>
          </thead>
          <tbody>{heroRows}</tbody>
          {monsterRows.length > 0 && <tbody className="initMonsters">{monsterRows}</tbody>}
        </table>

        <p className="initTableNote" aria-live="polite">
          {note}
        </p>

        <div className="initTableActions">
          <button
            type="button"
            className="drawnBtn initTableRollRest"
            onClick={rollTheRest}
            disabled={blanks === 0}
          >
            Roll the Rest
            <img src={InitIcon} alt="" aria-hidden="true" />
          </button>
          <button type="button" ref={startRef} className="drawnBtn isGreen initTableStart" onClick={start}>
            Start Battle
          </button>
        </div>

        <button type="button" className="initTableCancel" onClick={onCancel}>
          Cancel battle
        </button>
      </div>
    </div>
  );
}
