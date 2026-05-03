"use client";

import { getPlatformConfig } from "@/lib/platforms";
import { Platform } from "@/types";

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "salesforce") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 28 24" fill="currentColor" aria-hidden="true">
        <path d="M10.1 4.5c1-.9 2.2-1.5 3.6-1.5 1.7 0 3.2.9 4.1 2.2.8-.4 1.6-.6 2.5-.6 2.7 0 4.9 2.3 4.9 5.1 0 .3 0 .5-.1.8 1.4.7 2.3 2.1 2.3 3.7 0 2.3-1.9 4.2-4.2 4.2h-.3c-.7 1.5-2.2 2.6-4 2.6-1 0-2-.3-2.7-.9-.7 1.2-2 2-3.5 2-1.4 0-2.6-.7-3.3-1.8-.4.1-.8.2-1.3.2-2.3 0-4.2-1.9-4.2-4.2 0-1.4.7-2.7 1.8-3.4-.2-.5-.3-1.1-.3-1.7 0-2.9 1.9-5.2 4.3-5.7 0-.4.2-.7.4-1z" />
      </svg>
    );
  }

  if (platform === "marketo") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5 4h3v16H5V4zm5.5 4h3v12h-3V8zM16 2h3v18h-3V2z" />
      </svg>
    );
  }

  if (platform === "marketing_cloud") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7.5 18.5a5.5 5.5 0 0 1-.7-11A6.4 6.4 0 0 1 18.6 9a4.8 4.8 0 0 1-.9 9.5H7.5zm1.1-3h9.1a1.8 1.8 0 0 0 .1-3.6l-1.1-.1-.3-1.1a3.4 3.4 0 0 0-6.7.3l-.2 1.3-1.3.1a2.5 2.5 0 0 0 .4 5.1z" />
      </svg>
    );
  }

  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.16 5.67V3.39a1.71 1.71 0 0 0 1-1.55 1.72 1.72 0 0 0-3.44 0 1.71 1.71 0 0 0 1 1.55v2.28a5.39 5.39 0 0 0-2.81 1.57l-7.58-5.9a2.09 2.09 0 0 0 .05-.43 2.05 2.05 0 1 0-2.05 2.05 2 2 0 0 0 1.18-.38l7.45 5.8a5.4 5.4 0 0 0 .06 5.35l-2.27 2.27a1.76 1.76 0 0 0-.51-.08 1.78 1.78 0 1 0 1.78 1.78 1.76 1.76 0 0 0-.08-.51l2.24-2.24a5.42 5.42 0 1 0 3.98-9.38zm-.44 8.08a2.67 2.67 0 1 1 0-5.34 2.67 2.67 0 0 1 0 5.34z" />
    </svg>
  );
}

export default function ConnectButton({
  platform = "hubspot",
  className = "",
}: {
  platform?: Platform;
  className?: string;
}) {
  const config = getPlatformConfig(platform);

  return (
    <a
      href={config.connectPath}
      className={`inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-lg transition-colors ${className}`}
      style={{ backgroundColor: config.brandColor }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = config.hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = config.brandColor)}
    >
      <PlatformIcon platform={config.id} />
      Connect {config.name}
    </a>
  );
}
