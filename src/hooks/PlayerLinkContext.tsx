import { PlayerLinkContext, usePlayerLink } from "./usePlayerLink";

/** Holds the one shared player-link room. See usePlayerLink.ts. */
export function PlayerLinkProvider({ children }: { children: React.ReactNode }) {
  const value = usePlayerLink();
  return <PlayerLinkContext.Provider value={value}>{children}</PlayerLinkContext.Provider>;
}
