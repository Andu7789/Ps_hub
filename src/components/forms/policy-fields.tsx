import { inputClass, labelClass } from "@/components/ui/styles";

export function PolicyFields({ title = "", body = "" }: { title?: string; body?: string }) {
  return (
    <>
      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input id="title" name="title" defaultValue={title} required className={`mt-1 ${inputClass}`} />
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
