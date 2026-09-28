"use client";

import { secondaryButtonClass } from "@/components/ui/styles";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${secondaryButtonClass} print:hidden`}>
      {label}
    </button>
  );
}
