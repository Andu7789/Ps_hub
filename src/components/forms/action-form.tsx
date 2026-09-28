"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { primaryButtonClass } from "@/components/ui/styles";

// Wraps a server action that returns an ActionState, showing its error or
// confirmation under the fields. Submits through onSubmit rather than the
// form's action prop: React resets a form after an action-prop submit,
// which would wipe what someone typed whenever the server rejects it.
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  resetOnSuccess = false,
  className = "space-y-4",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-success">
          {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
