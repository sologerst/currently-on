/**
 * Only allow same-origin relative paths for auth `next` redirects.
 * Blocks open redirects like `//evil.com` or `https://evil.com`.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/friends",
): string {
  if (!raw) return fallback;
  const path = raw.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  if (path.includes("\\")) return fallback;
  if (/[\r\n]/.test(path)) return fallback;
  return path;
}

export function passwordIsStrongEnough(password: string): boolean {
  return password.length >= 8;
}
