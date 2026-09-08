import { useState } from "react";
import { Combatant } from "../../types/index";
import { EditableCell } from "../../utils/Utils";
import { confirmDialog } from "../../utils/notify";
import Icon from "../Icon";

interface EditBattleDialogProps {
  /** In initiative order, as the tracker shows them. */
  combatants: Combatant[];
  /** Whose turn it is, so the row can say so before it is taken away. */
  activeId?: string;
  onRemove: (id: string) => void;
  /** Ends the battle outright: everyone out, round and timer back to nothing. */
  onClear: () => void;
  updateCombatant: (
    combatantId: string,
    field: keyof Combatant,
    value: string | number | boolean | string[],
  ) => void;
  onClose: () => void;
}

/**
 * Changing who is in a fight that is already running.
 *
 * A player has to leave, or a corpse gets raised as something else — either
 * way the roster changes mid-combat, and until now the only way out was to
 * start the battle over.
 *
 * Two things happen here. Anyone can be taken out; and a MONSTER can be
 * renamed, because adding two goblins by hand leaves two rows both called
 * "Goblin" and this is where you tell them apart. Heroes are not renameable
 * here on purpose: a hero is a standing roster entry and their name belongs to
 * the Hero Manager, where renaming reaches the roster rather than only this
 * copy of them.
 *
 * It is a list rather than controls on the tracker's own rows: the tracker is
 * what you read every turn and does not need a bin on every line of it for the
 * once-a-session case this covers.
 */
export function EditBattleDialog({
  combatants,
  activeId,
  onRemove,
  onClear,
  updateCombatant,
  onClose,
}: EditBattleDialogProps) {
  const [editingField, setEditingField] = useState<string | null>(null);

  /* Asked before, not undone after — the same confirmation the managers use
     for a delete, because taking someone out mid-fight loses their hit points,
     conditions and death saves along with them. */
  const confirmRemove = async (c: Combatant) => {
    const ok = await confirmDialog(
      `Remove ${c.name} from the battle? Their hit points and conditions go with them.`,
      { title: "Remove from battle", tone: "danger", confirmLabel: "Remove" },
    );
    if (ok) onRemove(c.id);
  };

  /* Clearing is the one action here that cannot be walked back a row at a
     time, so it says what it takes with it. The window closes afterwards
     because there is nothing left in it to edit. */
  const confirmClear = async () => {
    const ok = await confirmDialog(
      combatants.length === 1
        ? "Clear the battle? The last combatant leaves, and the round and turn timer reset."
        : `Clear the battle? All ${combatants.length} combatants leave, and the round and turn timer reset.`,
      { title: "Clear battle", tone: "danger", confirmLabel: "Clear battle" },
    );
    if (ok) {
      onClear();
      onClose();
    }
  };

  return (
    <div className="editBattleOuter" role="presentation" onClick={onClose}>
      <div
        className="editBattleInner"
        role="dialog"
        aria-modal="true"
        aria-label="Edit the battle"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Edit Battle</h3>
        <p className="editBattleNote">
          Rename a monster, or take anyone out who has left the fight. Add someone with the
          Hero or Monster Manager.
        </p>

        {combatants.length === 0 ? (
          <p className="editBattleEmpty">Nobody is in this battle.</p>
        ) : (
          <ul className="editBattleList">
            {combatants.map((c) => (
              <li key={c.id} className={`editBattleRow is-${c.type}`}>
                <span className="editBattleInit">{c.initiative}</span>

                <span className="editBattleName">
                  {c.type === "monster" ? (
                    <EditableCell
                      entity={c}
                      field="name"
                      type="text"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateCombatant}
                    />
                  ) : (
                    c.name
                  )}
                  {c.id === activeId && <span className="editBattleTurn"> — their turn</span>}
                </span>

                <span className="editBattleHp">
                  {c.currHp}/{c.maxHp}
                </span>

                <button
                  type="button"
                  className="editBattleRemove"
                  title={`Remove ${c.name} from the battle`}
                  aria-label={`Remove ${c.name} from the battle`}
                  onClick={() => confirmRemove(c)}
                >
                  <Icon name="delete" color="currentColor" size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="editBattleActions">
          {combatants.length > 0 && (
            <button type="button" className="editBattleClear" onClick={confirmClear}>
              Clear Battle
            </button>
          )}
          <button type="button" className="editBattleDone" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
