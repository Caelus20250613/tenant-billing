"use client";

import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDFDocument, InvoiceData } from "@/src/components/InvoicePDF";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams } from "next/navigation";

import { getBillingRecords, getTenants } from "@/src/lib/firestore";

const normalizeName = (name: string) => {
  if (!name) return "";
  // Strip trailing circle numbers ①-⑳ and standard digits
  return name.replace(/[①-⑳0-9]+$/, '').trim();
};

export default function SummaryPage() {
  const params = useParams();
  const month = typeof params?.month === 'string' ? params.month : '2026-04';
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    async function loadData() {
      const records = await getBillingRecords(month);
      const tenants = await getTenants();

      // Grouping process
      const groups: Record<string, { recipientName: string; records: { record: any; tenant: any }[] }> = {};
      
      records.forEach(r => {
        const tenant = tenants.find(t => t.id === r.tenantId);
        const recipientName = tenant?.billingName || normalizeName(tenant?.roomName || "不明なテナント");
        
        if (!groups[recipientName]) {
          groups[recipientName] = { recipientName, records: [] };
        }
        groups[recipientName].records.push({ record: r, tenant });
      });

      const combined: InvoiceData[] = Object.entries(groups).map(([key, group]) => {
        const items: any[] = [];
        let total = 0;

        group.records.forEach(({ record, tenant }) => {
          const roomLabel = tenant ? ` (${tenant.roomName})` : "";
          
          (['light', 'power', 'water'] as const).forEach(type => {
            const detail = record.readings[type];
            if (detail && detail.usage > 0 || detail?.calculatedFee > 0) {
              const labels: Record<string, string> = { light: "電灯", power: "動力", water: "水道" };
              items.push({
                id: `${record.id}-${type}`,
                type,
                label: `${labels[type]}${group.records.length > 1 ? roomLabel : ""}`,
                previousValue: detail.previousValue,
                currentValue: detail.currentValue,
                usage: detail.usage,
                fee: detail.calculatedFee
              });
            }
          });
          total += record.totalAmount;
        });

        return {
          groupId: key,
          recipientName: group.recipientName,
          billingMonth: month,
          items,
          totalAmount: total
        };
      });

      setInvoices(combined);
      setIsClient(true);
    }
    loadData();
  }, [month]);

  if (!isClient) {
    return <div className="p-10">初期化中...</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">請求一覧・出力</h1>
          <p className="text-gray-500 mt-1">対象月: {month}</p>
        </div>
        
        {invoices.length > 0 && (
          <PDFDownloadLink
            document={<InvoicePDFDocument invoices={invoices} />}
            fileName={`invoices_${month}.pdf`}
          >
            {/* @ts-ignore */}
            {({ loading }) => (
              <Button disabled={loading} className="bg-blue-600 hover:bg-blue-700 font-semibold cursor-pointer">
                {loading ? "PDF生成中..." : "一括PDFダウンロード"}
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>請求先</TableHead>
              <TableHead className="text-right">内訳数</TableHead>
              <TableHead className="text-right font-bold">小計 (電灯)</TableHead>
              <TableHead className="text-right font-bold">小計 (動力)</TableHead>
              <TableHead className="text-right font-bold">小計 (水道)</TableHead>
              <TableHead className="text-right font-bold">合計金額</TableHead>
              <TableHead className="text-center">ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => {
              const sumFee = (type: string) => inv.items
                .filter(i => i.type === type)
                .reduce((acc, curr) => acc + curr.fee, 0);

              return (
                <TableRow key={inv.groupId}>
                  <TableCell className="font-medium text-gray-800">{inv.recipientName}</TableCell>
                  <TableCell className="text-right text-gray-500">{inv.items.length}</TableCell>
                  <TableCell className="text-right text-gray-600">
                    ¥{sumFee('light').toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    ¥{sumFee('power').toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    ¥{sumFee('water').toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-700">
                    ¥{inv.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      承認済
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
