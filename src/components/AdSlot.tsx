import { DISCORD_URL } from "../utils/links";

/**
 * Where ad inventory comes from.
 *
 * "house" serves our own promos and loads nothing third-party — no external
 * script, no cookie consent, no CSP change. Moving to a network is meant to be
 * a change to this constant plus the one branch in `AdSlot` that reads it:
 * everything else (placement, sizing, reserved space, the supporter gate) is
 * already in place and does not care what fills the box.
 *
 * Before switching to "network": a network's script is third-party, so it needs
 * a CSP entry and a consent banner for EU/UK traffic, and its fixed creative
 * sizes should be checked against SLOTS below.
 */
const AD_PROVIDER: "house" | "network" = "house";

/**
 * The reserved box for each placement, in the IAB sizes a network would expect,
 * so the space does not change when real ads arrive. The box is held whether or
 * not anything loads — an ad that fails to fill must not move the tracker.
 */
const SLOTS = {
  banner: { w: 728, h: 90, label: "leaderboard" },
  /* The rail is a fixed 100vh column whose buttons have a minimum height, and
     once the logo and the four buttons are in it there is only ~120px of slack
     under the patreon block. A 300x250 medium rectangle does not fit — it put
     the page into scrolling. Moving to a network therefore means either
     accepting 300x100 here, or finding ~130px in the rail (a shorter logo, or
     moving this slot out of the fixed-height column). */
  tower: { w: 300, h: 120, label: "rail promo" },
} as const;

export type AdSlotName = keyof typeof SLOTS;

interface AdSlotProps {
  slot: AdSlotName;
  /** Supporters do not see ads, and do not pay for the space either. */
  isSupporter: boolean;
  /** Starts the same Patreon flow as the button in the rail. */
  onSupport: () => void;
}

/** Our own promos, rotated by slot so the two boxes never say the same thing. */
function HouseAd({ slot, onSupport }: { slot: AdSlotName; onSupport: () => void }) {
  if (slot === "banner") {
    /* A button, not a link: it starts the same Patreon OAuth flow the rail's
       own button does rather than pointing at a page. */
    return (
      <button type="button" className="adHouse" onClick={onSupport}>
        <span className="adHouseTitle">Support the Tracker</span>
        <span className="adHouseBody">
          Back us on Patreon to turn these off, unlock the Battle Manager, and
          keep the dice rolling.
        </span>
      </button>
    );
  }

  return (
    <a className="adHouse" href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
      <span className="adHouseTitle">Join the Table</span>
      <span className="adHouseBody">
        Feature requests, bug reports and bad puns — our Discord is where the
        next version gets decided.
      </span>
    </a>
  );
}

export default function AdSlot({ slot, isSupporter, onSupport }: AdSlotProps) {
  if (isSupporter) return null;

  const { w, h, label } = SLOTS[slot];

  return (
    <aside
      className={`adSlot adSlot-${slot}`}
      style={{ "--ad-w": `${w}px`, "--ad-h": `${h}px` } as React.CSSProperties}
      aria-label={`Advertisement (${label})`}
    >
      {AD_PROVIDER === "house" ? <HouseAd slot={slot} onSupport={onSupport} /> : null}
    </aside>
  );
}
