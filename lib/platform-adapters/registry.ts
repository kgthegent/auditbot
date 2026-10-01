import { Platform } from "@/types";
import { hubSpotAdapter } from "./hubspot";
import { marketoAdapter } from "./marketo";
import { marketingCloudAdapter } from "./marketing-cloud";
import { salesforceAdapter } from "./salesforce";
import { PlatformAdapter } from "./types";

export const PLATFORM_ADAPTERS: Record<Platform, PlatformAdapter> = {
  hubspot: hubSpotAdapter,
  salesforce: salesforceAdapter,
  marketo: marketoAdapter,
  marketing_cloud: marketingCloudAdapter,
};

export function getPlatformAdapter(platform?: string | null) {
  if (platform && Object.prototype.hasOwnProperty.call(PLATFORM_ADAPTERS, platform)) {
    return PLATFORM_ADAPTERS[platform as Platform];
  }

  if (platform) throw new Error("Unsupported audit platform");
  return PLATFORM_ADAPTERS.hubspot;
}
