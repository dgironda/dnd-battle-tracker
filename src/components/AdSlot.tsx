import { useMemo } from "react";
import { DISCORD_URL } from "../utils/links";
import { pickCreative } from "../constants/AdCreatives";
import { track } from "../utils/telemetry";

/**
 * Where ad inventory comes from.
 *
 * - **"house"** — our own promos only. Loads nothing third-party.
 * - **"affiliate"** — banners from constants/AdCreatives, served from our own
 *   origin. Still nothing third-party: no script, no cookie, no consent, no CSP
 *   change, and nothing for a blocker to recognise. Falls back to the house
 *   promo whenever no creative fits, so the slot is never empty.
 * - **"network"** — not built. A network's script is third-party, which means a
 *   CSP entry and, for EEA/UK traffic, a certified consent platform.
 *
 * Everything else — placement, reserved space, the supporter gate — is already
 * in place and does not care what fills the box.
 */
const AD_PROVIDER: "house" | "affiliate" | "network" = "affiliate";

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

/**
 * One affiliate banner.
 *
 * `rel="sponsored"` is the part not to lose: this is a paid link, and that is
 * the attribute search engines require on one. `noopener noreferrer` keeps the
 * merchant from seeing where the click came from and from touching our window.
 */
function AffiliateAd({
  slot,
  creative,
}: {
  slot: AdSlotName;
  creative: { id: string; image: string; href: string; alt: string };
}) {
  return (
    <a
      className="adAffiliate"
      href={creative.href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => track("ad_clicked", { slot, creative: creative.id })}
    >
      <img src={creative.image} alt={creative.alt} loading="lazy" decoding="async" />
    </a>
  );
}

export default function AdSlot({ slot, isSupporter, onSupport }: AdSlotProps) {
  /* Drawn once per mount rather than per render: a banner that changed every
     time React re-rendered would be genuinely hostile, and it would wreck the
     click-through besides. */
  const creative = useMemo(
    () => (AD_PROVIDER === "affiliate" ? pickCreative(slot) : null),
    [slot],
  );

  if (isSupporter) return null;

  const { w, h, label } = SLOTS[slot];

  return (
    <aside
      className={`adSlot adSlot-${slot}`}
      style={{ "--ad-w": `${w}px`, "--ad-h": `${h}px` } as React.CSSProperties}
      aria-label={`Advertisement (${label})`}
    >
      {/* Labelled in the page, not only to a screen reader. Affiliate links are
          paid links and US disclosure rules expect a person to be able to see
          that — and it does no harm here, because a box that announces itself
          as an ad is exactly the mild annoyance these slots are for. */}
      <span className="adLabel" aria-hidden="true">
        Advertisement
      </span>

      {/* The house promo is the fallback, not a lesser option: an empty slot is
          no annoyance at all, so something is always in the box. */}
      {creative ? (
        <AffiliateAd slot={slot} creative={creative} />
      ) : (
        <HouseAd slot={slot} onSupport={onSupport} />
      )}

      {/* Only under a real ad. Under the house promo it would be telling
          somebody to turn off the thing already asking them to turn it off. */}
      {creative && (
        <button
          type="button"
          className="adOptOut"
          onClick={() => {
            track("supporter_prompt_clicked", {
              reason: slot === "banner" ? "banner_ad" : "tower_ad",
            });
            onSupport();
          }}
        >
          Sick of ads? Become a supporter.
        </button>
      )}
    </aside>
  );
}
