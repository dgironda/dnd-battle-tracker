import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import CombatantList from "./CombatantList";
import { v4 as uuidv4 } from "uuid";
const STORAGE_KEY = "dnd_battle_combatants";
export default function BattleTracker() {
    const [combatants, setCombatants] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(0);
    // Load combatants from localStorage on first render
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setCombatants(JSON.parse(saved));
        }
        else {
            const initialCombatants = [
                {
                    id: uuidv4(),
                    name: "Hero",
                    initiative: 15,
                    maxHP: 40,
                    currentHP: 40,
                    AC: 16,
                    STR: 14,
                    DEX: 12,
                    CON: 14,
                    INT: 10,
                    WIS: 13,
                    CHA: 11,
                    PP: 12,
                    actionBonus: 5,
                    move: 30,
                    conditions: [],
                    concentrating: false,
                    reactionUsed: false,
                },
                {
                    id: uuidv4(),
                    name: "Goblin",
                    initiative: 12,
                    maxHP: 7,
                    currentHP: 7,
                    AC: 13,
                    STR: 8,
                    DEX: 14,
                    CON: 10,
                    INT: 10,
                    WIS: 8,
                    CHA: 8,
                    PP: 9,
                    actionBonus: 4,
                    move: 30,
                    conditions: [],
                    concentrating: false,
                    reactionUsed: false,
                },
            ];
            setCombatants(initialCombatants);
        }
    }, []);
    // Log combatants for debugging
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && JSON.parse(saved).length > 0) {
            setCombatants(JSON.parse(saved));
        }
        else {
            const initialCombatants = [
                {
                    id: uuidv4(),
                    name: "Hero",
                    initiative: 15,
                    maxHP: 40,
                    currentHP: 40,
                    AC: 16,
                    STR: 14,
                    DEX: 12,
                    CON: 14,
                    INT: 10,
                    WIS: 13,
                    CHA: 11,
                    PP: 12,
                    actionBonus: 5,
                    move: 30,
                    conditions: [],
                    concentrating: false,
                    reactionUsed: false,
                },
                {
                    id: uuidv4(),
                    name: "Goblin",
                    initiative: 12,
                    maxHP: 7,
                    currentHP: 7,
                    AC: 13,
                    STR: 8,
                    DEX: 14,
                    CON: 10,
                    INT: 10,
                    WIS: 8,
                    CHA: 8,
                    PP: 9,
                    actionBonus: 4,
                    move: 30,
                    conditions: [],
                    concentrating: false,
                    reactionUsed: false,
                },
            ];
            setCombatants(initialCombatants);
        }
    }, []);
    return (_jsxs("div", { style: { padding: "2rem" }, children: [_jsx("h1", { children: "D&D Battle Tracker" }), _jsx(CombatantList, { combatants: combatants, currentTurn: currentTurn, setCombatants: setCombatants, setCurrentTurn: setCurrentTurn })] }));
}
