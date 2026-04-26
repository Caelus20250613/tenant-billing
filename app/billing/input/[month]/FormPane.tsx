"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { calculateInfraBilling } from "@/src/utils/billingCalculator";
import { getTenants, getBillingRecords, saveBillingRecordsBatch, updateBillingRecordsStatus } from "@/src/lib/firestore";
import { MonthlyBillingRecord } from "@/src/types";
import { useOCRStore } from "@/src/store/useOCRStore";

type InfraType = 'light' | 'power' | 'water';

interface InfraData {
  previous: number;
  current: number | '';
  baseFee: number;
  unitPrice: number;
}

interface TenantItem {
  tenantId: string;
  roomName: string;
  sortOrder: number;
  recordId?: string;
  light: InfraData | null;
  power: InfraData | null;
  water: InfraData | null;
}

const infraLabels: Record<InfraType, string> = {
  light: "電灯",
  power: "動力",
  water: "水道",
};

// YYYY-MM を前後にずらす
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function FormPane() {
  const params = useParams();
  const router = useRouter();
  const month = typeof params?.month === 'string' ? params.month : '';

  const [data, setData] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const inputRefs = useRef<{ [key: string]: HTMLInputElement }>({});

  const { extractedValues, clearExtractedValues, setExtractedValues } = useOCRStore();

  const RECOMMENDED_PROMPT = `あなたは検針表のデータ抽出エキスパートです。
添付された画像から各テナントの数値を[電灯, 動力, 水道]の順に抽出し、純粋な数値配列（JSON形式）のみを返してください。

ルール：
1. テナント入居行のみを対象とし、左から右へ「電灯、動力、水道」の順で並べる。
2. 水道の列がない場合は 0 とする。
3. 集計行（ビル全体等）や日付・室番などは一切含めない。
4. 出力例: [80685, 67667, 970, 27696, 51340, 3643, ...]`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(RECOMMENDED_PROMPT);
    toast.success("AIへの指示文をコピーしました。Gemini等に貼り付けてください。");
  };

  // OCR抽出値をフォームに反映
  useEffect(() => {
    if (extractedValues.length > 0 && data.length > 0) {
      setData((prev) => {
        const newData = JSON.parse(JSON.stringify(prev));
        let valIndex = 0;
        newData.forEach((tenant: TenantItem) => {
          if (tenant.light && valIndex < extractedValues.length) {
            tenant.light.current = extractedValues[valIndex++];
          }
          if (tenant.power && valIndex < extractedValues.length) {
            tenant.power.current = extractedValues[valIndex++];
          }
          if (tenant.water && valIndex < extractedValues.length) {
            tenant.water.current = extractedValues[valIndex++];
          }
        });
        return newData;
      });
      clearExtractedValues();
    }
  }, [extractedValues, data.length, clearExtractedValues]);

  const handlePasteApply = () => {
    const numbers = pastedText.match(/\d+(\.\d+)?/g);
    if (numbers) {
      const values = numbers.map(n => parseFloat(n));
      setExtractedValues(values);
      setPastedText("");
      setIsPasteDialogOpen(false);
      toast.success(`${values.length}個の数値を反映しました。内容をご確認ください。`);
    } else {
      toast.error("数値が見つかりませんでした。");
    }
  };

  // データをPENDINGとして保存
  const handleSaveToFirestore = async () => {
    try {
      const recordsToSave: MonthlyBillingRecord[] = data.map(t => {
        const buildMeterReading = (infra: InfraData | null) => {
          if (!infra) return { previousValue: 0, currentValue: 0, usage: 0, calculatedFee: 0 };
          const cur = typeof infra.current === 'number' ? infra.current : 0;
          // 共通の計算ロジックを使用（billingCalculator と一致させる）
          const result = calculateInfraBilling(infra.previous, cur, {
            baseFee: infra.baseFee,
            unitPrice: infra.unitPrice,
          });
          return {
            previousValue: infra.previous,
            currentValue: cur,
            usage: result.usage ?? 0,
            calculatedFee: result.fee ?? 0,
          };
        };

        const light = buildMeterReading(t.light);
        const power = buildMeterReading(t.power);
        const water = buildMeterReading(t.water);
        const total =
          (t.light ? light.calculatedFee : 0) +
          (t.power ? power.calculatedFee : 0) +
          (t.water ? water.calculatedFee : 0);

        return {
          id: t.recordId || '',
          billingMonth: month,
          tenantId: t.tenantId,
          readings: { light, power, water },
          totalAmount: total,
          status: 'PENDING' as const,
        };
      });

      await saveBillingRecordsBatch(recordsToSave);
      toast.success("データを保存しました（ステータス: 未承認）");
      // 保存後にリロードして recordId を最新化
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("保存に失敗しました。");
    }
  };

  // 保存済みレコードを一括承認
  const handleApprove = async () => {
    try {
      const records = await getBillingRecords(month);
      const ids = records.map(r => r.id).filter(Boolean);
      if (ids.length === 0) {
        toast.error("保存済みのレコードがありません。先にデータを保存してください。");
        return;
      }
      await updateBillingRecordsStatus(ids, 'APPROVED');
      toast.success(`${month} のデータを承認しました`);
    } catch (err) {
      console.error(err);
      toast.error("承認に失敗しました。");
    }
  };

  const loadData = async () => {
    setLoading(true);
    const tenants = await getTenants();
    const records = await getBillingRecords(month);

    // 前月を計算
    const prevMonthStr = shiftMonth(month, -1);
    const prevRecords = await getBillingRecords(prevMonthStr);

    const mergedData: TenantItem[] = tenants.map(tenant => {
      const record = records.find(r => r.tenantId === tenant.id);
      const prevRecord = prevRecords.find(r => r.tenantId === tenant.id);

      const buildInfra = (type: InfraType): InfraData | null => {
        if (!tenant.settings[type].hasMeter) return null;
        const currentVal = record?.readings[type]?.currentValue;
        return {
          previous: prevRecord?.readings[type]?.currentValue || 0,
          current: currentVal !== undefined ? currentVal : ('' as const),
          baseFee: tenant.settings[type].baseFee,
          unitPrice: tenant.settings[type].unitPrice,
        };
      };

      return {
        tenantId: tenant.id,
        roomName: tenant.roomName,
        sortOrder: tenant.sortOrder,
        recordId: record?.id,
        light: buildInfra('light'),
        power: buildInfra('power'),
        water: buildInfra('water'),
      };
    });

    setData(mergedData);
    setLoading(false);
  };

  useEffect(() => {
    if (month) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const handleCurrentChange = (tenantIndex: number, type: InfraType, value: string) => {
    const newData = [...data];
    const val = value === '' ? '' : Number(value);
    const infra = newData[tenantIndex][type];
    if (infra) {
      infra.current = val;
    }
    setData(newData);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, tenantIndex: number, type: InfraType) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const isShift = e.shiftKey;
      let targetIndex = tenantIndex;
      let found = false;

      while (!found) {
        targetIndex = isShift ? targetIndex - 1 : targetIndex + 1;
        if (targetIndex < 0 || targetIndex >= data.length) break;
        if (data[targetIndex]?.[type] !== null) {
          found = true;
          break;
        }
      }

      if (found) {
        const nextKey = `${targetIndex}-${type}`;
        inputRefs.current[nextKey]?.focus();
        inputRefs.current[nextKey]?.select();
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10 sticky top-0">
        {/* 月ナビゲーション */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/billing/input/${shiftMonth(month, -1)}`)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
            title="前月"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 min-w-[120px] text-center">
            {month} 検針入力
          </h1>
          <button
            onClick={() => router.push(`/billing/input/${shiftMonth(month, 1)}`)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
            title="翌月"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* アクションボタン群 */}
        <div className="flex gap-2">
          <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
            <DialogTrigger render={<Button variant="outline">AIの結果を一括入力</Button>} />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>テキストから数値を抽出</DialogTitle>
                <DialogDescription>
                  LLM等の解析結果をそのまま貼り付けてください。数値だけを順番に抽出して入力欄に埋めます。
                </DialogDescription>
                <div className="mt-2 text-right">
                  <button
                    onClick={copyPrompt}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    AIへの指示文をコピー
                  </button>
                </div>
              </DialogHeader>
              <div className="py-4">
                <textarea
                  className="w-full h-40 p-3 border rounded-md text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ここにペースト... (例: 101号室 電灯: 1234, 動力: 5678...)"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsPasteDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handlePasteApply}>反映する</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleApprove}>
            承認する
          </Button>
          <Button onClick={handleSaveToFirestore}>
            データを保存
          </Button>
        </div>
      </div>

      {/* テナント一覧 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>データを読み込み中...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white border-2 border-dashed border-gray-200 rounded-xl shadow-sm">
            <p className="text-lg font-bold mb-2">テナントデータがありません</p>
            <p className="text-sm">左メニューの「テナントマスタ管理」からテナントを登録してください。</p>
          </div>
        ) : (
          data.map((tenant, index) => (
            <div key={tenant.tenantId} className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary">{tenant.roomName}</h3>
              </div>

              <div className="p-4">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-16">種別</TableHead>
                      <TableHead className="w-24 text-right">前月指針</TableHead>
                      <TableHead className="w-32">当月指針</TableHead>
                      <TableHead className="w-24 text-right">使用量</TableHead>
                      <TableHead className="w-32 text-right">請求額 (円)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(['light', 'power', 'water'] as InfraType[]).map((type) => {
                      const infra = tenant[type];
                      if (!infra) return null;

                      const key = `${index}-${type}`;
                      const calcResult = calculateInfraBilling(
                        infra.previous,
                        infra.current,
                        { baseFee: infra.baseFee, unitPrice: infra.unitPrice }
                      );

                      return (
                        <TableRow key={type}>
                          <TableCell className="font-semibold text-gray-600">
                            {infraLabels[type]}
                          </TableCell>
                          <TableCell className="text-right text-gray-500">
                            {infra.previous.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={infra.current}
                              onChange={(e) => handleCurrentChange(index, type, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, type)}
                              ref={(el) => {
                                if (el) inputRefs.current[key] = el;
                              }}
                              className={`h-9 w-full text-right focus-visible:ring-2 ${
                                calcResult.isError ? "border-red-500 focus-visible:ring-red-500 bg-red-50 text-red-700" : ""
                              }`}
                              placeholder="入力"
                              title={calcResult.errorMessage}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {calcResult.usage !== null ? (
                              calcResult.usage.toLocaleString()
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                            {calcResult.isError && (
                              <span className="text-red-500 text-xs block font-bold mt-1">警告</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-blue-600">
                            {calcResult.fee !== null ? `¥${calcResult.fee.toLocaleString()}` : <span className="text-gray-300">-</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
