import type { FieldDef, Option } from "@/lib/registers/types";
import { inputValue } from "@/lib/registers/values";
import { inputClass, labelClass } from "@/components/ui/styles";

// One form control for a register field. Member and reference pickers get
// their choices from `choices`.
export function FieldInput({
  field,
  value,
  choices,
  optionsOverride,
}: {
  field: FieldDef;
  value: unknown;
  choices?: Option[];
  optionsOverride?: Option[];
}) {
  const id = `f-${field.name}`;
  const current = value === undefined ? (field.defaultValue ?? "") : inputValue(field, value);

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name={field.name} defaultChecked={value === undefined ? field.defaultValue === "true" : Boolean(value)} />
        {field.label}
      </label>
    );
  }

  let control;
  switch (field.type) {
    case "textarea":
      control = <textarea id={id} name={field.name} defaultValue={current} required={field.required} rows={field.name === "body" ? 14 : 4} className={`mt-1 ${inputClass}`} />;
      break;
    case "select": {
      const options = optionsOverride ?? field.options ?? [];
      control = (
        <select id={id} name={field.name} defaultValue={current || options[0]?.value} className={`mt-1 ${inputClass}`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    }
    case "member":
    case "ref":
      control = (
        <select id={id} name={field.name} defaultValue={current} required={field.required} className={`mt-1 ${inputClass}`}>
          <option value="">{field.required ? "Choose…" : "None"}</option>
          {(choices ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    default: {
      const type = { date: "date", datetime: "datetime-local", email: "email", tel: "tel", number: "number", money: "number" }[
        field.type as string
      ] ?? "text";
      control = (
        <input
          id={id}
          name={field.name}
          type={type}
          defaultValue={current}
          required={field.required}
          step={field.type === "money" ? "0.01" : field.type === "number" ? "any" : undefined}
          min={field.min}
          max={field.max}
          className={`mt-1 ${inputClass}`}
        />
      );
    }
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {field.label}
        {field.required && <span className="text-danger"> *</span>}
      </label>
      {control}
      {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
    </div>
  );
}
