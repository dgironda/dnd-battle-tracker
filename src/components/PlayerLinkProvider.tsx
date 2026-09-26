import type { ReactNode } from "react";
import { PlayerLinkContext, usePlayerLink } from "../hooks/usePlayerLink";

/** Makes one shared room available to the tracker and the Battle Manager. See usePlayerLink. */
export default function PlayerLinkProvider({ children }: { children: ReactNode }) {
  const link = usePlayerLink();
  return <PlayerLinkContext.Provider value={link}>{children}</PlayerLinkContext.Provider>;
}
