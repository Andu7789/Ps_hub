"use client";

import { useActionState } from "react";
import { requestMagicLinkAction } from "@/lib/actions/auth";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, formAction, pending] = useActionState(requestMagicLinkAction, undefined);

  if (state?.ok) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve sent a sign-in link to {state.ok}. Click it to continue.
        </p>
      </div>
    );
  }

  const error = state?.error ?? initialError;
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to sign in. No password needed. New here? The same link
        gets you started.
      </p>
      <form action={formAction} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={next ?? "/"} />
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input id="email" type="email" name="email" required autoComplete="email" placeholder="you@example.com" className={inputClass} />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={`w-full ${primaryButtonClass}`}>
          {pending ? "Sending…" : "Send sign-in link"}
        </button>
      </form>
    </div>
  );
}
