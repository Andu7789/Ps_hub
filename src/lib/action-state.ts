// What every form action hands back to its form (via useActionState):
// an error to show, or a short confirmation.
export type ActionState = { error?: string; ok?: string } | undefined;

export function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export function optionalField(formData: FormData, name: string): string | null {
  return field(formData, name) || null;
}
