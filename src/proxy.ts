import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase session fresh. Server Components can read cookies but
// not write them, so without this an expired access token would be
// refreshed on every page load and the new one thrown away — and Supabase
// treats a reused refresh token as a sign of theft and ends the session.
// Next.js 16 calls this file proxy.ts (middleware.ts is silently ignored;
// see PS Clean's DECISIONS.md #8).
//
// It also serves a business's public page on its own domain (Website
// module): a request to www.theirbusiness.co.uk/book is shown the page at
// /s/<their slug>/book.
export async function proxy(request: NextRequest) {
  const customDomainRewrite = await rewriteForCustomDomain(request);
  if (customDomainRewrite) return customDomainRewrite;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

const MAIN_HOST = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").hostname;

async function rewriteForCustomDomain(request: NextRequest): Promise<NextResponse | null> {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (!host || host === MAIN_HOST || host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) return null;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null;

  let slug: string | null = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/hub_slug_for_domain`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domain: host }),
    });
    if (res.ok) slug = (await res.json()) as string | null;
  } catch {
    return null;
  }
  if (!slug) return null;

  const { pathname } = request.nextUrl;
  // Links on the public pages already carry /s/<slug>, and review links
  // live outside it.
  if (pathname.startsWith(`/s/${slug}`) || pathname.startsWith("/review/")) return null;
  const url = request.nextUrl.clone();
  url.pathname = `/s/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
