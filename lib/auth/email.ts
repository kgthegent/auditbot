export function isPlaceholderEmail(email?: string | null) {
  return !!email?.endsWith("@placeholder.local");
}
