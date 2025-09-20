import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function CombatantList({ combatants, currentTurn, setCombatants, setCurrentTurn, }) {
    const nextTurn = () => {
        setCurrentTurn((prev) => (combatants.length ? (prev + 1) % combatants.length : 0));
    };
    const updateHP = (id, hp) => {
        setCombatants((prev) => prev.map((c) => (c.id === id ? { ...c, currentHP: hp } : c)));
    };
    return (_jsxs("div", { children: [_jsx("button", { onClick: nextTurn, style: { marginBottom: "1rem" }, children: "Next Turn" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Initiative" }), _jsx("th", { children: "HP" }), _jsx("th", { children: "AC" }), _jsx("th", { children: "Conditions" })] }) }), _jsx("tbody", { children: combatants
                            .sort((a, b) => b.initiative - a.initiative)
                            .map((c, index) => (_jsxs("tr", { style: {
                                backgroundColor: index === currentTurn ? "#d1ffd6" : "transparent",
                            }, children: [_jsx("td", { children: c.name }), _jsx("td", { children: c.initiative }), _jsxs("td", { children: [_jsx("input", { type: "number", value: c.currentHP, min: 0, max: c.maxHP, onChange: (e) => updateHP(c.id, Number(e.target.value)), style: { width: "50px" } }), " ", "/ ", c.maxHP] }), _jsx("td", { children: c.AC }), _jsx("td", { children: c.conditions.join(", ") })] }, c.id))) })] })] }));
}
