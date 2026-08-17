"use client";

import { useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ReceiptActionsProps {
  invoiceNumber: string;
  paperWidth: "80mm" | "58mm";
  onPaperWidthChange: (width: "80mm" | "58mm") => void;
}

export function ReceiptActions({
  invoiceNumber,
  paperWidth,
  onPaperWidthChange,
}: ReceiptActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  async function handleGeneratePdf(action: "download" | "preview") {
    const element = document.getElementById("receipt-content");
    if (!element) {
      toast.error("Receipt element not found.");
      return;
    }

    setIsGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { PDFDocument } = await import("pdf-lib");

      // @ts-ignore
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      } as any);

      const mmToPt = 2.83465;
      const paperWidthMm = paperWidth === "58mm" ? 58 : 80;
      const pdfWidthPt = paperWidthMm * mmToPt;
      const pdfHeightPt = (canvas.height * pdfWidthPt) / canvas.width;

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([pdfWidthPt, pdfHeightPt]);

      const pngDataUrl = canvas.toDataURL("image/png");
      const pngImage = await pdfDoc.embedPng(pngDataUrl);

      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pdfWidthPt,
        height: pdfHeightPt,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const filename = `Receipt-${invoiceNumber || "transaction"}-${paperWidth}.pdf`;

      if (action === "download") {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("Receipt PDF successfully downloaded.");
      } else {
        const blobUrl = URL.createObjectURL(blob);
        setPdfUrl(blobUrl);
        setIsPreviewOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate receipt PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleClosePreview() {
    setIsPreviewOpen(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }

  return (
    <>
      <div className="no-print flex flex-wrap items-center justify-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Paper Size:</span>
          <Select
            value={paperWidth}
            onValueChange={(val) => onPaperWidthChange(val as "80mm" | "58mm")}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="80mm">80mm (Std)</SelectItem>
              <SelectItem value="58mm">58mm (Mini)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-4 w-[1px] bg-border hidden sm:block" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            disabled={isGenerating}
            onClick={() => handleGeneratePdf("download")}
            className="h-8 text-xs gap-1.5"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download PDF
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isGenerating}
            onClick={() => handleGeneratePdf("preview")}
            className="h-8 text-xs gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Open PDF
          </Button>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-2xl sm:max-w-3xl h-[85vh] flex flex-col p-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base flex items-center justify-between">
              <span>Receipt PDF Preview ({paperWidth}) - {invoiceNumber}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 w-full h-full min-h-0 py-2 bg-muted/20 rounded-md overflow-hidden">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title={`Receipt Preview ${invoiceNumber}`}
                className="w-full h-full border-0 rounded-md bg-white shadow-inner"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex flex-row items-center justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClosePreview}
              className="text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Close
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handleGeneratePdf("download")}
              className="text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
