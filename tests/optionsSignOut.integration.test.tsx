/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlobalProvider } from "../src/hooks/optionsContext";
import OptionsPanel from "../src/components/OptionsPanel";

/**
 * Signing out of Patreon. The session cookie is httpOnly and lasts 30 days,
 * so this button is the only way off a shared laptop short of clearing cookies.
 */

function renderOptions(onPatreonSignOut?: () => void) {
  return render(
    <GlobalProvider>
      <OptionsPanel
        onClose={() => {}}
        isSupporter={true}
        onLockedPick={() => {}}
        onPatreonSignOut={onPatreonSignOut}
      />
    </GlobalProvider>,
  );
}

describe("signing out of Patreon from Options", () => {
  it("is offered while signed in, and signs out when pressed", () => {
    const signOut = vi.fn();
    renderOptions(signOut);
    fireEvent.click(screen.getByRole("button", { name: "Sign out of Patreon" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("is not offered to somebody who never signed in", () => {
    renderOptions();
    expect(screen.queryByRole("button", { name: "Sign out of Patreon" })).toBeNull();
  });
});
