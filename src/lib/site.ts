export const PRODUCT_NAME = "PS Business Hub";

// Where links in emails point. Emails have no incoming request to take a
// host from, so this comes from config.
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Only same-site paths are allowed as a post-sign-in destination, so a
// crafted sign-in link can't bounce someone off to another site.
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
