import { useCallback, useEffect, useState } from "react";
import {
  exchangeCode,
  fetchSupporterState,
  forgetLegacyCode,
  signOut as endSession,
  supporterPrompt,
  takeReturnedCode,
  type SupporterState,
} from "../utils/patreonSession";
import { confirmDialog, notify } from "../utils/notify";
import { identifyPerson, setPerson } from "../utils/telemetry";
import { forgetIdentity } from "../utils/consent";

/**
 * Whether this visitor is a supporter — as the server says, never the browser
 * — and the two ways that changes: coming back from Patreon, and signing out.
 *
 * Patreon OAuth, verified. This used to be a courtesy gate: the redirect's
 * code went into localStorage, nothing ever exchanged it, and
 * `getItem("patreon_code")` was the whole test — satisfiable from the console
 * in four seconds. The exchange now happens in functions/api/patreon/, which
 * is the only place that can hold the client secret, and the browser is told
 * the answer rather than deciding it.
 *
 * The cost of that, paid once: an existing supporter's stored code means
 * nothing any more, so they see the prompt and re-authorise.
 *
 * `prompting` is off in dev mode, where there is no Patreon to ask.
 */
export function useSupporter(prompting: boolean) {
  const [isSupporter, setIsSupporter] = useState(false);
  /* False only when the server could not answer — a missing secret, a bad
     deploy, no network. Kept apart from `isSupporter` because "we cannot check"
     and "you never paid" are different things to say to a patron. */
  const [gateAvailable, setGateAvailable] = useState(true);
  /* Signed in with Patreon at all, pledge or not — which is what decides
     whether Options offers a way to sign out. */
  const [signedIn, setSignedIn] = useState(false);
  /* The "support us" invitation. Starts hidden and is raised once the server
     has answered — see settle(). */
  const [inviteVisible, setInviteVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const settle = (state: SupporterState, justSignedIn = false) => {
      if (cancelled) return;
      setIsSupporter(state.isSupporter);
      setGateAvailable(state.available);
      setSignedIn(state.personId !== null);
      /* The prompt waits for the answer instead of racing it. Defaulting it to
         visible meant every returning supporter got a flash of "support us"
         before the session came back and took it away again. What it waits
         for — and why a sign-in without a pledge is told so rather than invited
         to sign in again — is supporterPrompt in utils/patreonSession. */
      const prompt = prompting ? supporterPrompt(state, justSignedIn) : "none";
      setInviteVisible(prompt === "invite");
      if (prompt === "no-pledge") {
        void notify(
          "You're signed in with Patreon, but that account doesn't have an active pledge to " +
            "Simulacrum Technologies, so the supporter perks are still off. If you've just " +
            "pledged, sign in again with Support us on Patreon to switch them on.",
          { title: "No pledge on that account" },
        );
      }
      /* A stable id across every device this patron signs in on — which is the
         only thing identify() is actually for, and the reason the exchange was
         worth building. Anonymous visitors stay anonymous. */
      if (state.personId) identifyPerson(state.personId);
    };

    const params = new URLSearchParams(window.location.search);

    if (params.has("code")) {
      /* Off the URL before anything else can read it — the address bar, the
         referrer on the next outbound link, and any analytics pageview. */
      window.history.replaceState({}, document.title, window.location.pathname);
      const code = takeReturnedCode(params);
      if (code) {
        exchangeCode(code).then((state) => settle(state, true));
      } else {
        /* A code this tab never asked for: from somebody's link, or a sign-in
           started in another tab. Not traded in — see beginPatreonSignIn. */
        void notify(
          "That Patreon sign-in didn't start on this page, so it wasn't used. To sign in, use " +
            "Support us on Patreon.",
          { title: "Sign-in not used", tone: "warning" },
        );
        fetchSupporterState().then(settle);
      }
    } else {
      fetchSupporterState().then(settle);
    }

    forgetLegacyCode();
    return () => {
      cancelled = true;
    };
  }, [prompting]);

  /* A person property rather than an event: it describes who is sitting there,
     not something that just happened, so every event they have ever sent can be
     filtered by it. That is what makes "do supporters run bigger fights?" a
     question you can actually ask.

     The boolean, never the Patreon code that produced it. */
  useEffect(() => {
    setPerson({ is_supporter: isSupporter });
  }, [isSupporter]);

  /* The session cookie is HttpOnly and lasts 30 days, so without this a
     supporter who signed in on somebody else's laptop stayed signed in there
     for a month. No prompt afterwards: somebody who just signed out does not
     need inviting straight back in. */
  const signOut = useCallback(async () => {
    const ok = await confirmDialog(
      "The supporter perks switch off on this device until you sign in again. Your heroes, " +
        "monsters and battles stay exactly as they are.",
      { title: "Sign out of Patreon?", confirmLabel: "Sign out", cancelLabel: "Stay signed in" },
    );
    if (!ok) return;
    const state = await endSession();
    setIsSupporter(state.isSupporter);
    setSignedIn(false);
    forgetIdentity();
  }, []);

  const closeInvite = useCallback(() => setInviteVisible(false), []);

  return { isSupporter, gateAvailable, signedIn, inviteVisible, closeInvite, signOut };
}
