const DEFAULT_TIMEOUT_MS = 10_000;

export const PROVIDER_HOSTS = {
  marketo: [".mktorest.com"],
  marketingCloudAuth: [".auth.marketingcloudapis.com"],
  marketingCloudRest: [".rest.marketingcloudapis.com"],
} as const;

function hostMatches(hostname: string, suffixes: readonly string[]) {
  return suffixes.some((suffix) => {
    const normalizedSuffix = suffix.replace(/^\./, "");
    return hostname === normalizedSuffix || hostname.endsWith(suffix);
  });
}

export function normalizeProviderBaseUrl(
  value: string,
  allowedHostSuffixes: readonly string[]
) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Invalid provider URL");
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !hostMatches(hostname, allowedHostSuffixes)) {
    throw new Error("Unsupported provider URL");
  }

  if ((url.pathname && url.pathname !== "/") || url.search || url.hash) {
    throw new Error("Provider URL must be a base URL");
  }

  return url.origin;
}

export function providerFetch(
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  return fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
}
