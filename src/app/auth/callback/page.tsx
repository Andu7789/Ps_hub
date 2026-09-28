import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { confirmSignInAction } from "@/lib/actions/auth";
import { safeNextPath } from "@/lib/site";
import { primaryButtonClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Confirm sign-in" };

// Landing page for a sign-in email. Needs a real click: see
// confirmSignInAction for why the token isn't used on page load.
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;
  if (!token_hash || !type) redirect("/login?error=auth");

  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sign in</p>
      <h1 className="mt-2 text-xl font-semibold text-foreground">Confirm it&apos;s you</h1>
      <p className="mt-2 text-sm text-muted-foreground">One more step. Confirm below to finish signing in.</p>
      <form action={confirmSignInAction} className="mt-6">
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={safeNextPath(next)} />
        <button type="submit" className={`w-full ${primaryButtonClass}`}>
          Confirm sign-in
        </button>
      </form>
    </div>
  );
}
