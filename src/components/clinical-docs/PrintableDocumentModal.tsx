import React, { useRef } from "react";
import { Download, FileText, Printer, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrintableDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  documentRefCode?: string | undefined;
  children: React.ReactNode;
}

export function PrintableDocumentModal({
  open,
  onOpenChange,
  title,
  documentRefCode,
  children,
}: PrintableDocumentModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-slate-100 dark:bg-slate-950 border border-border">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-md px-6 py-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600">
              <FileText className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">{title}</DialogTitle>
              {documentRefCode && (
                <DialogDescription className="text-xs font-mono text-muted-foreground">
                  Ref: {documentRefCode}
                </DialogDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1.5 text-xs shadow-xs"
            >
              <Printer className="size-3.5" /> Print / Save PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Document Content Viewport */}
        <div ref={contentRef} className="p-4 sm:p-8 print:p-0">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
