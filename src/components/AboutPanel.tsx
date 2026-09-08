import KeyA from "../assets/draftsvgs_v2/key_a.svg";
import KeyS from "../assets/draftsvgs_v2/key_s.svg";
import KeyD from "../assets/draftsvgs_v2/key_d.svg";
import KeyW from "../assets/draftsvgs_v2/key_w.svg";
import KeyE from "../assets/draftsvgs_v2/key_e.svg";
import KeyR from "../assets/draftsvgs_v2/key_r.svg";
import KeyX from "../assets/draftsvgs_v2/key_x.svg";

interface AboutPanelProps {
  onClose: () => void;
}

/* The shortcuts were seven near-identical <p> tags with the key and its
   description run together. As data they lay out as a proper two-column list,
   which is what a key/meaning pair is. */
const SHORTCUTS: { art: string; key: string; does: string }[] = [
  { art: KeyA, key: "A", does: "Check or uncheck the current combatant's Action" },
  { art: KeyS, key: "S", does: "Check or uncheck their Bonus action" },
  { art: KeyD, key: "D", does: "Check or uncheck their Movement" },
  { art: KeyW, key: "W", does: "Open or close the Hero Manager" },
  { art: KeyE, key: "E", does: "Open or close the Monster Manager" },
  { art: KeyR, key: "R", does: "Open or close the Battle Manager" },
  { art: KeyX, key: "X", does: "Close an open stat block" },
];

const CREDITS: { role: string; name: string; href?: string }[] = [
  { role: "Created by", name: "DM Dave" },
  { role: "Additional code", name: "Jason Peterson", href: "https://madmilliner.github.io/jasonPeterson/" },
  { role: "Art", name: "Aether Ilo — Emily", href: "https://bio.site/aetherillo" },
  { role: "QA", name: "Danny Cullen, Jayme Andrews, Zach Dender" },
  { role: "Special thanks", name: "Wolf Harrington" },
];

export default function AboutPanel({ onClose }: AboutPanelProps) {
  return (
    <div id="about" role="dialog" aria-modal="true" aria-label="About and instructions">
      <button id="aboutCloseButton" onClick={onClose} aria-label="Close">
        X
      </button>

      <h2>About the Tracker</h2>

      <div id="aboutGrid">
        <section id="instructions">
          <h3>How it works</h3>
          <ul>
            <li>
              Pick your edition — 5e 2014 or 2024 — with the rules switch in Options. It sets
              concentration checks, condition wording, and which monsters the Monster Manager offers.
            </li>
            <li>Monsters leave the Manager when they join the fray, so the roster is what is left in reserve.</li>
            <li>
              Concentration and death-save reminders appear on their own once the matching condition
              is marked. Turn the reminders and the turn timer off in Options.
            </li>
            <li>Click a combatant&apos;s name for their stat block; click their HP to deal damage or heal.</li>
            <li>Patreon members get the Battle Manager: save battles, and export or import everything.</li>
          </ul>
        </section>

        <section id="shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <dl>
            {SHORTCUTS.map(({ art, key, does }) => (
              <div className="shortcutRow" key={key}>
                <dt>
                  <img src={art} alt={`${key} key`} className="keyShortcut" />
                </dt>
                <dd>{does}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section id="credits">
        <h3>Who made this</h3>
        <ul>
          {CREDITS.map(({ role, name, href }) => (
            <li key={role}>
              <span className="creditRole">{role}</span>
              <span className="creditName">
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {name}
                  </a>
                ) : (
                  name
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
