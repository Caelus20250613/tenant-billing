"use client";

import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDFDocument, InvoiceData } from "@/src/components/InvoicePDF";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams } from "next/navigation";

import { getBillingRecords, getTenants } from "@/src/lib/firestore";

export default function SummaryPage() {
  const params = useParams();
  const month = typeof params?.month === 'string' ? params.month : '2026-04';
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    async function loadData() {
      const records = await getBillingRecords(month);
      const tenants = await getTenants();

      const combined: InvoiceData[] = records.map(r => {
        const tenant = tenants.find(t => t.id === r.tenantId);
        
        const buildDetail = (type: 'light'|'power'|'water') => {
          const detail = r.readings[type];
          if (!detail) return null;
          // check if tenant doesn't actually have this meter now, optional but safe
          return {
            previousValue: detail.previousValue,
            currentValue: detail.currentValue,
            usage: detail.usage,
            fee: detail.calculatedFee
          };
        };

        return {
          tenantId: r.tenantId,
          tenantName: tenant ? tenant.roomName : "不明なテナント",
          billingMonth: r.billingMonth,
          light: buildDetail('light'),
          power: buildDetail('power'),
          water: buildDetail('water'),
          totalAmount: r.totalAmount
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
              <TableHead>テナント</TableHead>
              <TableHead className="text-right">電灯</TableHead>
              <TableHead className="text-right">動力</TableHead>
              <TableHead className="text-right">水道</TableHead>
              <TableHead className="text-right font-bold">合計金額</TableHead>
              <TableHead className="text-center">ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.tenantId}>
                <TableCell className="font-medium text-gray-800">{inv.tenantName}</TableCell>
                <TableCell className="text-right text-gray-600">
                  {inv.light !== null && inv.light.fee !== null ? `¥${inv.light.fee.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell className="text-right text-gray-600">
                  {inv.power !== null && inv.power.fee !== null ? `¥${inv.power.fee.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell className="text-right text-gray-600">
                  {inv.water !== null && inv.water.fee !== null ? `¥${inv.water.fee.toLocaleString()}` : '-'}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
