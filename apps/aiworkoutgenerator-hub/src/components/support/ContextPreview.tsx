"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SUPPORT_CENTER_COPY } from "@/lib/support-constants";

// ============================================
// Component
// ============================================

export function ContextPreview() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="context">
        <AccordionTrigger className="text-sm">
          {SUPPORT_CENTER_COPY.contextPreviewTitle}
        </AccordionTrigger>
        <AccordionContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {SUPPORT_CENTER_COPY.contextPreviewItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
