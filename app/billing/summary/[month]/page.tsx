"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { InvoiceData } from "@/src/types";
import { Button } from "@/components/ui/button";

// @react-pdf/renderer はブラウザ専用のため SSR を無効にして動的インポート
const PDFDownloadButton = dynamic(
  () => import("@/src/components/PDFDownloadButton").then(m => m.PDFDownloadButton),
  { ssr: false, loading: () => <Button disabled className="bg-blue-600 font-semibold">読み込み中...</Button> }
);
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getBillingRecords, getTenants, updateBillingRecordsStatus, deleteBillingRecordsByMonth } from "@/src/lib/firestore";
import { MonthlyBillingRecord, Tenant } from "@/src/types";

interface GroupRecord {
  record: MonthlyBillingRecord;
  tenant: Tenant | undefined;
}

interface BillingGroup {
  recipientName: string;
  records: GroupRecord[];
}

// YYYY-MM を前後にずらす
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const normalizeName = (name: string) => {
  if (!name) return "";
  return name.replace(/[①-⑳0-9]+$/, '').trim();
};

// ステータスの優先順位（低い方を表示）
const STATUS_PRIORITY: Record<string, number> = { PENDING: 0, APPROVED: 1, ISSUED: 2 };

interface GroupedInvoice extends InvoiceData {
  recordIds: string[];
  status: 'PENDING' | 'APPROVED' | 'ISSUED';
}

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
  const month = typeof params?.month === 'string' ? params.month : '';

  const [invoices, setInvoices] = useState<GroupedInvoice[]>([]);
  const [isClient, setIsClient] = useState(false);

  const loadData = async () => {
    const records = await getBillingRecords(month);
    const tenants = await getTenants();

    const groups: Record<string, BillingGroup> = {};

    records.forEach(r => {
      const tenant = tenants.find(t => t.id === r.tenantId);
      const recipientName = tenant?.billingName || normalizeName(tenant?.roomName || "不明なテナント");

      if (!groups[recipientName]) {
        groups[recipientName] = { recipientName, records: [] };
      }
      groups[recipientName].records.push({ record: r, tenant });
    });

    const statusMap: ('PENDING' | 'APPROVED' | 'ISSUED')[] = ['PENDING', 'APPROVED', 'ISSUED'];

    const combined: GroupedInvoice[] = Object.entries(groups).map(([key, group]) => {
      const items: InvoiceData['items'] = [];
      let total = 0;
      const recordIds: string[] = [];

      // グループ内の最低ステータスを算出（PENDING が1件でもあれば PENDING 表示）
      let minPriority = 2;

      group.records.forEach(({ record, tenant }) => {
        recordIds.push(record.id);
        const priority = STATUS_PRIORITY[record.status] ?? 0;
        if (priority < minPriority) minPriority = priority;

        const roomLabel = tenant ? ` (${tenant.roomName})` : "";

        (['light', 'power', 'water'] as const).forEach(type => {
          const detail = record.readings[type];
          if (detail && (detail.usage > 0 || detail.calculatedFee > 0)) {
            const labels: Record<string, string> = { light: "電灯", power: "動力", water: "水道" };
            items.push({
              id: `${record.id}-${type}`,
              type,
              label: `${labels[type]}${group.records.length > 1 ? roomLabel : ""}`,
              previousValue: detail.previousValue,
              currentValue: detail.currentValue,
              usage: detail.usage,
              fee: detail.calculatedFee,
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
        totalAmount: total,
        recordIds,
        status: statusMap[minPriority],
      };
    });

    setInvoices(combined);
    setIsClient(true);
  };

  useEffect(() => {
    if (month) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const handleDeleteMonth = async () => {
    if (!confirm(`${month} の請求データを全件削除しますか？\nこの操作は取り消せません。`)) return;
    try {
      const count = await deleteBillingRecordsByMonth(month);
      toast.success(`${month} のデータ ${count} 件を削除しました`);
      setInvoices([]);
    } catch (err) {
      console.error(err);
      toast.error("削除に失敗しました。");
    }
  };

  const handleMarkAsIssued = async (inv: GroupedInvoice) => {
    try {
      await updateBillingRecordsStatus(inv.recordIds, 'ISSUED');
      toast.success(`${inv.recipientName} を発行済みにしました`);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("ステータス更新に失敗しました。");
    }
  };

  const statusBadge = (status: GroupedInvoice['status']) => {
    const map = {
      PENDING:  { label: "未承認", cls: "bg-yellow-100 text-yellow-800" },
      APPROVED: { label: "承認済",  cls: "bg-green-100 text-green-800" },
      ISSUED:   { label: "発行済",  cls: "bg-blue-100 text-blue-800" },
    };
    const { label, cls } = map[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
        {label}
      </span>
    );
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
        初期化中...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        {/* 月ナビゲーション */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/billing/summary/${shiftMonth(month, -1)}`)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
            title="前月"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">請求一覧・出力</h1>
            <p className="text-gray-500 mt-1">対象月: {month}</p>
          </div>
          <button
            onClick={() => router.push(`/billing/summary/${shiftMonth(month, 1)}`)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
            title="翌月"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 items-center">
          {invoices.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleDeleteMonth}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                この月のデータを削除
              </Button>
              <PDFDownloadButton invoices={invoices} month={month} />
            </>
          )}
        </div>
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
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-400">
                  {month} のデータがありません
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const sumFee = (type: string) =>
                  inv.items.filter(i => i.type === type).reduce((acc, curr) => acc + curr.fee, 0);

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
                      {statusBadge(inv.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      {inv.status !== 'ISSUED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsIssued(inv)}
                          className="text-xs"
                        >
                          発行済みにする
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
