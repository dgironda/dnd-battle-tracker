import { useEffect } from "react";
import { DISCORD_URL } from "../utils/links";
import { readConsent, setConsent } from "../utils/consent";

interface PrivacyPolicyProps {
  onClose: () => void;
}

/**
 * What we collect, written from the code rather than from a template.
 *
 * Every claim here is checkable against something: the event list is
 * `EventMap` in utils/telemetry.ts, the storage keys are `STORAGE_KEYS` in
 * utils/LocalStorage.ts, the cookie is `SESSION_COOKIE` in server/patreon.ts.
 * A generic policy would have been faster and would have been describing a
 * different website.
 *
 * It carries a working "change your mind" control rather than telling people to
 * clear their cookies, because a policy that describes a right without offering
 * a way to use it is not much of a policy.
 *
 * Not legal advice and not a substitute for a lawyer's eye if the site ever
 * takes payment directly or ships to somewhere with its own rules.
 */
export default function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  /* Escape closes it, like every other panel here. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const consent = readConsent();

  return (
    <div className="privacyOuter" role="presentation" onClick={onClose}>
      <div
        className="privacyInner"
        role="dialog"
        aria-modal="true"
        aria-label="Privacy policy"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="privacyClose"
          onClick={onClose}
          aria-label="Close the privacy policy"
        >
          X
        </button>

        <h2>Privacy</h2>
        <p className="privacyLede">
          The short version: your heroes, your monsters and your battles never leave
          your browser. We count how the tracker is used, and only if you say yes.
        </p>

        <h3>What stays on your device</h3>
        <p>
          Everything you make. Heroes, monsters, the fight in progress, the round and
          turn, your saved battles, the battle log and your settings all live in your
          browser&apos;s own storage. Photos you attach go into IndexedDB on the same
          machine. None of it is uploaded, none of it reaches us, and clearing your
          browser data deletes it for good — we have no copy to restore.
        </p>

        <h3>What we measure, if you agree</h3>
        <p>
          Analytics run through <strong>PostHog</strong>, and only after you accept
          the notice at the bottom of the page. Decline and nothing is sent at all.
        </p>
        <p>We record:</p>
        <ul>
          <li>Page views, and clicks in a general way (which controls get used).</li>
          <li>
            A fight starting and ending — how many heroes and monsters, how many
            rounds. <em>Never their names.</em>
          </li>
          <li>Which managers get opened, and which conditions get applied.</li>
          <li>Whether the Patreon prompt was shown and whether it was clicked.</li>
          <li>When browser storage is close to full, so we know it is a real problem.</li>
          <li>Crashes: the error, where it happened, and which build you were on.</li>
          <li>
            Your device shape, browser, rough location, and which wallpaper and
            orientation you use.
          </li>
        </ul>
        <p>
          We deliberately do <strong>not</strong> record the contents of your game:
          no character names, no monster names, no battle names, no photos, no notes.
        </p>

        <h3>If you sign in with Patreon</h3>
        <p>
          Signing in sends you to Patreon, and Patreon sends us back a one-time code.
          We exchange it on our server for your <strong>Patreon user ID</strong> and
          whether you are an active patron — nothing else. Your name, email and
          payment details are never requested and never seen by us. The access token
          from that exchange is used once and discarded rather than stored.
        </p>
        <p>
          We then set one cookie, <code>bt_supporter</code>, which holds your Patreon
          user ID and supporter status, signed so it cannot be forged and readable
          only by our server. It lasts 30 days. That user ID is also attached to your
          analytics record, so we can tell whether supporters use the tracker
          differently — which means that if you sign in, your analytics stop being
          anonymous to us.
        </p>

        <h3>Who else is involved</h3>
        <ul>
          <li>
            <strong>Cloudflare</strong> hosts the site and sees the ordinary request
            information any web host does.
          </li>
          <li>
            <strong>PostHog</strong> stores the analytics above. Requests go through
            our own domain rather than theirs.
          </li>
          <li>
            <strong>Patreon</strong>, only if you choose to sign in.
          </li>
          <li>
            <strong>Google Fonts</strong> serves the typefaces.
          </li>
        </ul>
        <p>
          We do not sell anything to anybody, and there are no advertising or
          data-broker trackers on this site.
        </p>

        <h3>What you can do about it</h3>
        <p>
          Change your mind about analytics whenever you like — the button below does
          it immediately, and opting out also deletes the identifiers PostHog has
          stored in your browser. To remove everything else, clear this site&apos;s
          data in your browser; that erases your heroes, monsters and battles too,
          because that is where they live.
        </p>
        <p>
          To have your Patreon-linked analytics record deleted, ask us on{" "}
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">
            Discord
          </a>{" "}
          — we will need the Patreon account so we can find it.
        </p>

        <div className="privacyChoice">
          <p className="privacyChoiceState">
            Analytics are currently{" "}
            <strong>
              {consent === "granted" ? "on" : consent === "denied" ? "off" : "undecided"}
            </strong>
            .
          </p>
          <button
            type="button"
            className="drawnBtn"
            onClick={() => {
              setConsent(consent === "granted" ? "denied" : "granted");
              onClose();
            }}
          >
            {consent === "granted" ? "Turn analytics off" : "Turn analytics on"}
          </button>
        </div>

        <p className="privacyFoot">
          Questions, or something here that does not match what you see? Tell us on{" "}
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">
            Discord
          </a>
          . Last updated 10 September 2026.
        </p>
      </div>
    </div>
  );
}
