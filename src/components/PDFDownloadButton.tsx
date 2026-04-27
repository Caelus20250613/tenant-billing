"use client";

// @react-pdf/renderer はブラウザ専用のため、このファイルは必ず next/dynamic + ssr:false で読み込むこと
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "./InvoicePDF";
import type { InvoiceData } from "@/src/types";
import { Button } from "@/components/ui/button";

interface Props {
  invoices: InvoiceData[];
  month: string;
}

export function PDFDownloadButton({ invoices, month }: Props) {
  return (
    <PDFDownloadLink
      document={<InvoicePDFDocument invoices={invoices} />}
      fileName={`invoices_${month}.pdf`}
    >
      {/* @ts-ignore */}
      {({ loading }: { loading: boolean }) => (
        <Button
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 font-semibold cursor-pointer"
        >
          {loading ? "PDF生成中..." : "一括PDFダウンロード"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
