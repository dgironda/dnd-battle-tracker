/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useState } from "react";
import { GlobalProvider } from "../src/hooks/optionsContext";
import { CombatProvider } from "../src/components/BattleTracker/CombatContext";
import { RosterProvider } from "../src/hooks/rosterContext";
import { HeroStatBlockHover } from "../src/components/BattleTracker/HeroStatBlockHover";
import { MonsterStatBlockHover } from "../src/components/BattleTracker/MonsterStatBlockHover";
import { AbilityStats } from "../src/components/AbilityStats";
import type { Combatant, Hero, Monster } from "../src/types/index";

/**
 * The side-car stat panels, and the ability row in the managers.
 *
 * The hero and monster panels were two copies of one another and now share
 * their frame, their conditions line and their notes (StatPanel.tsx). These
 * pin what each still prints of its own, and the behaviour they share.
 */

const hero = {
  id: "h1", name: "Gerwin", player: "Sam", hp: 30, ac: 16, init: 3, pp: 13,
  str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 13, conditions: [], link: "",
} as unknown as Hero;

function monster(over: Partial<Monster> = {}): Monster {
  return {
    id: "m1", name: "Owlbear", hp: 59, ac: 13, init: 1, pp: 13,
    str: 20, dex: 12, con: 17, int: 3, wis: 12, cha: 7,
    conditions: ["Prone"], link: "https://example.com/owlbear",
    ...over,
  } as unknown as Monster;
}

const inFight = {
  id: "m1", name: "Owlbear", type: "monster", currHp: 40, maxHp: 59, tHp: 0, initiative: 14,
  action: false, bonus: false, move: false, reaction: false, conditions: ["Prone"],
  deathsaves: [], notes: "Hates the light", ac: 13, init: 1,
} as unknown as Combatant;

function providers(children: React.ReactNode) {
  return (
    <GlobalProvider>
      <RosterProvider>
        <CombatProvider>{children}</CombatProvider>
      </RosterProvider>
    </GlobalProvider>
  );
}

const panelOf = (trigger: HTMLElement) => trigger.closest(".statBlockTrigger")!.querySelector(".statHover")!;

describe("the stat panels", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("storedHeroes", JSON.stringify([{ ...hero, notes: "" }]));
    localStorage.setItem("storedMonsters", "[]");
    localStorage.setItem("storedCombatants", JSON.stringify([inFight]));
  });

  it("prints a monster's numbers the way the Monster Manual does, with its conditions and notes", () => {
    render(providers(
      <MonsterStatBlockHover monster={monster()} currentHp={40} updateCombatant={() => {}}>
        <span>Owlbear name</span>
      </MonsterStatBlockHover>,
    ));
    const panel = within(panelOf(screen.getByText("Owlbear name")) as HTMLElement);

    expect(panel.getByText("Armor Class")).toBeInTheDocument();
    expect(panel.getByText("40")).toBeInTheDocument();
    expect(panel.getByText("20 (+5)")).toBeInTheDocument();
    expect(panel.getByText("3 (-4)")).toBeInTheDocument();
    expect(panel.getByText("Passive Perception 13")).toBeInTheDocument();
    expect(panel.getByText("Prone")).toBeInTheDocument();
    expect(panel.getByText("Hates the light")).toBeInTheDocument();
    expect(panel.getByRole("link", { name: /View Full Stat Block/ })).toHaveAttribute(
      "href",
      "https://example.com/owlbear",
    );
  });

  it("drops a stat-block link that is not a web address", () => {
    render(providers(
      <MonsterStatBlockHover monster={monster({ link: "javascript:alert(1)" })} updateCombatant={() => {}}>
        <span>Owlbear name</span>
      </MonsterStatBlockHover>,
    ));
    expect(screen.queryByRole("link", { name: /View Full Stat Block/ })).toBeNull();
  });

  it("prints a hero's sheet, and says none when there are no conditions", () => {
    render(providers(
      <HeroStatBlockHover hero={hero}>
        <span>Gerwin name</span>
      </HeroStatBlockHover>,
    ));
    const sheet = panelOf(screen.getByText("Gerwin name")) as HTMLElement;
    const panel = within(sheet);
    const cells = (selector: string) =>
      [...sheet.querySelectorAll(selector)].map((row) => [...row.children].map((c) => c.textContent));

    expect(panel.getByText("Player: Sam")).toBeInTheDocument();
    expect(cells(".heroStatACInit > div")).toEqual([["AC", "16"], ["Initiative", "+3"]]);
    expect(cells(".heroStatAbility > div")[0]).toEqual(["STR", "16", "+3"]);
    expect(cells(".heroStatAbility > div")[3]).toEqual(["INT", "8", "-1"]);
    expect(panel.getByText("none")).toBeInTheDocument();
    expect(panel.getByText("Enter Gerwin's notes here")).toBeInTheDocument();
  });

  it("opens on a click, and X closes it unless somebody is typing", () => {
    render(providers(
      <>
        <input aria-label="A field" />
        <HeroStatBlockHover hero={hero}>
          <span>Gerwin name</span>
        </HeroStatBlockHover>
      </>,
    ));
    const trigger = screen.getByText("Gerwin name");
    const panel = panelOf(trigger);

    fireEvent.click(trigger);
    expect(panel).toHaveClass("isOpen");

    fireEvent.keyDown(screen.getByLabelText("A field"), { key: "x" });
    expect(panel).toHaveClass("isOpen");

    fireEvent.keyDown(document.body, { key: "x", ctrlKey: true });
    expect(panel).toHaveClass("isOpen");

    fireEvent.keyDown(document.body, { key: "x" });
    expect(panel).not.toHaveClass("isOpen");
  });

  it("closes from its own X button", () => {
    render(providers(
      <MonsterStatBlockHover monster={monster()} updateCombatant={() => {}}>
        <span>Owlbear name</span>
      </MonsterStatBlockHover>,
    ));
    const trigger = screen.getByText("Owlbear name");
    const panel = panelOf(trigger);
    fireEvent.click(trigger);
    expect(panel).toHaveClass("isOpen");

    fireEvent.click(within(panel as HTMLElement).getByRole("button", { name: "X" }));
    expect(panel).not.toHaveClass("isOpen");
  });
});

describe("the managers' ability row", () => {
  function Row() {
    const [editingField, setEditingField] = useState<string | null>(null);
    const [entry, setEntry] = useState(hero);
    return (
      <AbilityStats
        entity={entry}
        editingField={editingField}
        setEditingField={setEditingField}
        updateEntity={(_id, field, value) => setEntry((e) => ({ ...e, [field]: value }))}
      />
    );
  }

  it("shows the eight numbers in sheet order, each editable", () => {
    const { container } = render(<Row />);
    const labels = [...container.querySelectorAll(".heroStatLabel")].map((l) => l.textContent);
    expect(labels).toEqual(["STR", "DEX", "CON", "INT", "WIS", "CHA", "PP", "INIT"]);
    expect(container.querySelectorAll(".heroStat .setEditingField")).toHaveLength(8);
  });
});
