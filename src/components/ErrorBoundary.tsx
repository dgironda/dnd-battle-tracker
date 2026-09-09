import { Component, type ErrorInfo, type ReactNode } from "react";
import ErrorNotice from "./ErrorNotice";
import { markHandled, type CaughtError } from "../utils/errorReport";
import { clearCurrentFight, isCrashLoop, noteCrash } from "../utils/crashRecovery";
import { reportCrash } from "../utils/telemetry";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * "page" replaces everything and assumes the app is gone. "panel" replaces
   * only what it wraps, and says so — the fight behind it is still running.
   */
  variant?: "page" | "panel";
  /** What broke, in the words on the button that opened it: "Hero Manager". */
  label?: string;
  /**
   * Where the notice goes when it replaces a panel. The managers are centred
   * overlays, so their fallback is one too; the roster sits in the page's own
   * grid, and a fixed card there would float over a page that is still fine.
   */
  placement?: "overlay" | "inline";
  /** Panels close themselves; the notice offers this as the way out. */
  onClose?: () => void;
}

interface ErrorBoundaryState {
  caught: CaughtError | null;
  /** How many reloads this tab has already burned on the same crash. */
  loop: boolean;
}

/**
 * Catches a render that throws, so a bad component costs a panel instead of
 * the evening.
 *
 * React unmounts the entire tree when nothing catches — the DM gets a white
 * page mid-combat and no idea why. One of these at the root turns that into a
 * message; one around each panel keeps a crash inside the thing that crashed.
 *
 * Note the two gaps this does **not** cover, both of them by React's design:
 * errors thrown in event handlers, and rejected promises. Those are caught by
 * the window listeners in GlobalErrorNotice instead, which is why the app
 * mounts both.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { caught: null, loop: false };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    /* Claimed here as well as in componentDidCatch: this runs first, and every
       frame earlier is one less chance of the window listener beating us to it
       (see HANDOVER_MS in GlobalErrorNotice). */
    markHandled(error);
    return { caught: { source: "render", error, at: Date.now() } };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    /* React's development build re-throws this at the window so devtools get a
       real stack. Claim it here or GlobalErrorNotice draws a second card for
       the crash this boundary is already showing. */
    markHandled(error);

    /* Still log it. A boundary that swallows the error makes the app friendlier
       and debugging it strictly harder. */
    console.error("Caught by an error boundary:", error, info.componentStack);

    const caught: CaughtError = {
      source: "render",
      error,
      componentStack: info.componentStack ?? undefined,
      where: this.props.label,
      at: Date.now(),
    };
    /* Most crashes are never reported by hand — the card asks, and some people
       are mid-fight and just reload. This is how we hear about those. */
    reportCrash(caught);

    this.setState((previous) => ({
      caught: { ...caught, at: previous.caught?.at ?? caught.at },
      /* Only a whole-page crash counts towards the loop: a panel that throws
         every time it opens is annoying, not a reason to offer to delete the
         fight. */
      loop: this.props.variant === "page" ? isCrashLoop(noteCrash()) : false,
    }));
  }

  private retry = () => {
    if (this.props.variant === "page") {
      window.location.reload();
      return;
    }
    this.setState({ caught: null, loop: false });
  };

  private clearFight = () => {
    clearCurrentFight();
    window.location.reload();
  };

  render() {
    const { caught, loop } = this.state;
    if (!caught) return this.props.children;

    const isPage = this.props.variant === "page";
    const wrapper = isPage
      ? "errorScreen"
      : `errorPanelWrap is-${this.props.placement ?? "overlay"}`;
    return (
      <div className={wrapper}>
        <ErrorNotice
          caught={caught}
          variant={isPage ? "page" : "panel"}
          onRetry={this.retry}
          retryLabel={isPage ? "Reload the tracker" : "Try again"}
          onDismiss={!isPage ? this.props.onClose : undefined}
          onClearFight={isPage && loop ? this.clearFight : undefined}
        />
      </div>
    );
  }
}
