import { useEffect, useState } from "react";
import { ACTIVE_CAMPAIGN_KEY, readActiveCampaign } from "../utils/LocalStorage";

/**
 * Which campaign this is, once dmOS has picked one.
 *
 * Shown only then: somebody who has never used dmOS has a single, unnamed
 * campaign and nothing to tell apart. Switching happens in dmOS; this page
 * reloads when it does (reloadOnCampaignSwitch), and only a rename arrives
 * here live.
 */
export function CampaignBadge() {
  const [campaign, setCampaign] = useState(readActiveCampaign);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_CAMPAIGN_KEY) setCampaign(readActiveCampaign());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!campaign) return null;
  return (
    <div id="campaignBadge" title="Campaign, chosen in dmOS">
      {campaign.name}
    </div>
  );
}
