import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "sa_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const EMAIL_LINK_MAX_AGE = 15 * 60;
const MAX_TOKEN_LENGTH = 4096;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SessionIdentity {
  userId: string;
  email: string;
  hubId: string | null;
}

export interface Session extends SessionIdentity {
  iat: number;
  exp: number;
}

interface EmailClaim {
  email: string;
  sourceUserId: string;
  portalId: string;
  hubId: string;
  iat: number;
  exp: number;
}

type CookieReader = { cookies: { get(name: string): { value: string } | undefined } };

function signingSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32 || secret.trim() !== secret) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes of random secret material");
  }
  return secret;
}

export function assertSessionConfigured() {
  signingSecret();
}

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isHubId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 255 && !/[\u0000-\u001f\u007f]/.test(value);
}

function validTimes(value: Record<string, unknown>, maxAge: number, now: number) {
  return Number.isSafeInteger(value.iat) && Number.isSafeInteger(value.exp) &&
    (value.iat as number) <= now && (value.exp as number) > now &&
    (value.exp as number) > (value.iat as number) &&
    (value.exp as number) - (value.iat as number) <= maxAge;
}

function encodeToken(purpose: string, payload: object) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const input = `${purpose}.${encoded}`;
  const signature = createHmac("sha256", signingSecret()).update(input).digest("base64url");
  return `${input}.${signature}`;
}

function decodeToken(token: string | undefined, purpose: string): Record<string, unknown> | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== purpose || !/^[A-Za-z0-9_-]+$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return null;
    const signature = Buffer.from(parts[2], "base64url");
    const expected = createHmac("sha256", signingSecret()).update(`${parts[0]}.${parts[1]}`).digest();
    // Require canonical encoding, including the otherwise unused base64 padding bits.
    if (signature.toString("base64url") !== parts[2] || signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
    const bytes = Buffer.from(parts[1], "base64url");
    if (bytes.toString("base64url") !== parts[1]) return null;
    const payload: unknown = JSON.parse(bytes.toString("utf8"));
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  } catch {
    // A malformed cookie or missing secret must never authenticate a request.
    return null;
  }
}

export function createSessionToken(identity: SessionIdentity, now = Math.floor(Date.now() / 1000)) {
  if (!UUID.test(identity.userId) || !isValidEmail(identity.email) || (identity.hubId !== null && !isHubId(identity.hubId)) || !Number.isSafeInteger(now)) {
    throw new Error("Invalid session identity");
  }
  return encodeToken("session-v1", { ...identity, iat: now, exp: now + SESSION_MAX_AGE });
}

export function verifySessionToken(token: string | undefined, now = Math.floor(Date.now() / 1000)): Session | null {
  const payload = decodeToken(token, "session-v1");
  if (!payload || typeof payload.userId !== "string" || !UUID.test(payload.userId) || !isValidEmail(payload.email) ||
    (payload.hubId !== null && !isHubId(payload.hubId)) || !validTimes(payload, SESSION_MAX_AGE, now)) return null;
  return payload as unknown as Session;
}

export function readSession(request: CookieReader): Session | null {
  // Intentionally do not read sa_email or sa_hub_id. Legacy cookies prove nothing.
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function setSessionCookies(response: NextResponse, identity: SessionIdentity) {
  const token = createSessionToken(identity);
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax" as const,
  };
  response.cookies.set(SESSION_COOKIE_NAME, token, { ...options, maxAge: SESSION_MAX_AGE });
  for (const name of ["sa_email", "sa_hub_id"]) {
    response.cookies.set(name, "", { ...options, maxAge: 0 });
  }
}

// A separate signing purpose prevents email-link context from being accepted as a session.
// The full token is also persisted and atomically consumed in magic_links for one-time use.
export function createEmailClaimToken(
  claim: Omit<EmailClaim, "iat" | "exp">,
  now = Math.floor(Date.now() / 1000)
) {
  if (!isValidEmail(claim.email) || !UUID.test(claim.sourceUserId) || !UUID.test(claim.portalId) || !isHubId(claim.hubId)) {
    throw new Error("Invalid email verification context");
  }
  return encodeToken("email-claim-v1", { ...claim, nonce: randomBytes(16).toString("hex"), iat: now, exp: now + EMAIL_LINK_MAX_AGE });
}

export function verifyEmailClaimToken(token: string, now = Math.floor(Date.now() / 1000)): EmailClaim | null {
  const payload = decodeToken(token, "email-claim-v1");
  if (!payload || !isValidEmail(payload.email) || typeof payload.sourceUserId !== "string" || !UUID.test(payload.sourceUserId) ||
    typeof payload.portalId !== "string" || !UUID.test(payload.portalId) || !isHubId(payload.hubId) || !validTimes(payload, EMAIL_LINK_MAX_AGE, now)) return null;
  return payload as unknown as EmailClaim;
}
