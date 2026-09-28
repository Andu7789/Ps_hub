import { inputClass, labelClass } from "@/components/ui/styles";

export const POLICY_CATEGORIES = {
  hr: "Employment",
  health_safety: "Health and safety",
  safeguarding: "Safeguarding",
  data_protection: "Data protection",
  general: "General",
} as const;

export function PolicyFields({ title = "", body = "", category = "hr" }: { title?: string; body?: string; category?: string }) {
  return (
    <>
      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input id="title" name="title" defaultValue={title} required className={`mt-1 ${inputClass}`} />
      </div>
      <div>
        <label htmlFor="category" className={labelClass}>
          Category
        </label>
        <select id="category" name="category" defaultValue={category} className={`mt-1 ${inputClass}`}>
          {Object.entries(POLICY_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="body" className={labelClass}>
          Policy text
        </label>
        <textarea id="body" name="body" defaultValue={body} required rows={16} className={`mt-1 ${inputClass} leading-relaxed`} />
        <p className="mt-1 text-xs text-muted-foreground">Leave a blank line between paragraphs.</p>
      </div>
    </>
  );
}
