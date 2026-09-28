import { saveRecordAction } from "@/lib/actions/records";
import type { RegisterDef } from "@/lib/registers/types";
import type { Lookups } from "@/lib/registers/values";
import type { RecordRow } from "@/lib/registers/data";
import { ActionForm } from "@/components/forms/action-form";
import { FieldInput } from "@/components/registers/field-input";

// The add / edit form for any register.
export function RecordForm({
  def,
  record,
  lookups,
  memberChoices,
  presets = {},
}: {
  def: RegisterDef;
  record: RecordRow | null;
  lookups: Lookups;
  memberChoices: { value: string; label: string }[];
  presets?: Record<string, string>;
}) {
  const editable = def.fields.filter((f) => !f.readonly);
  const id = record ? String(record[def.idColumn ?? "id"]) : "";

  return (
    <ActionForm action={saveRecordAction} submitLabel={record ? "Save changes" : `Add ${def.singular}`}>
      <input type="hidden" name="register" value={def.key} />
      {record && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {editable.map((field) => {
          const wide = field.type === "textarea" || field.type === "boolean";
          // A member-keyed record (pay details) can't be moved to another person.
          if (record && def.idColumn === field.name) {
            return <input key={field.name} type="hidden" name={field.name} value={String(record[field.name])} />;
          }
          return (
            <div key={field.name} className={wide ? "sm:col-span-2" : ""}>
              <FieldInput
                field={field}
                value={record ? record[field.name] : presets[field.name]}
                choices={
                  field.type === "member"
                    ? memberChoices
                    : field.type === "ref"
                      ? [...(lookups[field.ref!] ?? new Map())].map(([value, label]) => ({ value, label }))
                      : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </ActionForm>
  );
}
