import type { ModuleKey } from "@/lib/modules";

// A register is one module table shown as a list of records with an add
// and edit form: training records, risks, insurance policies… Most of the
// Hub is registers, so they're described here as data and rendered by
// one set of pages (src/app/app/r) instead of a page set per table.

export type Option = { value: string; label: string };

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "date"
  | "datetime"
  | "number"
  | "money"
  | "select"
  | "boolean"
  | "member"
  | "ref";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  // For "ref": the register whose records can be picked.
  ref?: string;
  help?: string;
  min?: number;
  max?: number;
  // Worked out by the database (a score, a deadline): shown, never edited.
  readonly?: boolean;
  // For selects: preselected value on a new record.
  defaultValue?: string;
};

export type RegisterDef = {
  key: string;
  module: ModuleKey | null;
  table: string;
  title: string;
  singular: string;
  description: string;
  fields: FieldDef[];
  // Columns on the list page (field names).
  list: string[];
  // The field that names a record in lists and links.
  titleField: string;
  order: { column: string; ascending: boolean };
  // Date fields that make a record "due" on the overview and in reminder
  // emails, while it isn't closed.
  due?: { field: string; label: string }[];
  // A record matching this counts as finished: never due, and filtered
  // out of the "open" view.
  closedWhen?: { field: string; values: (string | boolean)[] };
  // Who manages it (default manager). Pay data is owner-only.
  minRole?: "manager" | "owner";
  // The column holding the person a record is about, if any. Such records
  // also show on that person's staff page.
  memberField?: string;
  // Tables keyed by member rather than their own id.
  idColumn?: string;
  // What staff can do with records about themselves.
  staff?: {
    read: boolean;
    // Fields staff fill in; `options` narrows a select for them.
    create?: { label: string; fields: string[]; options?: Record<string, Option[]> };
  };
  // Registers created through their own flow (e.g. issued from a
  // template) have no generic "add" form.
  noCreate?: boolean;
};
