"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { getTenants, saveBillingRecordsBatch } from "@/src/lib/firestore";
import { MonthlyBillingRecord } from "@/src/types";
import { useOCRStore } from "@/src/store/useOCRStore";
import { calculateInfraBilling } from "@/src/utils/billingCalculator";

type InfraType = 'light' | 'power' | 'water';

interface InfraData {
  current: number | '';
  baseFee: number;
  unitPrice: number;
}

interface TenantItem {
  tenantId: string;
  roomName: string;
  sortOrder: number;
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

// 現在の年月を返す
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function SetupPage() {
  const [startMonth, setStartMonth] = useState(currentMonth());
  const [data, setData] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const inputRefs = useRef<{ [key: string]: HTMLInputElement }>({});

  const { extractedValues, clearExtractedValues, setExtractedValues } = useOCRStore();

  // 前月（実際に保存される月）
  const targetMonth = shiftMonth(startMonth, -1);

  // テナント一覧を動的に組み込んだプロンプトを生成する
  const buildPrompt = () => {
    const tenantLines = data.map(t => {
      const meters = (['light', 'power', 'water'] as InfraType[])
        .filter(type => t[type] !== null)
        .map(type => infraLabels[type])
        .join('・');
      return `- ${t.roomName}：${meters}`;
    }).join('\n');

    const exampleLines = data.map(t => {
      const fields = (['light', 'power', 'water'] as InfraType[])
        .filter(type => t[type] !== null)
        .map(type => `"${type}": 数値`)
        .join(', ');
      return `  "${t.roomName}": {${fields}}`;
    }).join(',\n');

    return `あなたは検針表のデータ抽出エキスパートです。
添付された画像から、以下のテナントそれぞれの指針値を抽出してください。

【対象テナント一覧】
${tenantLines}

【出力形式】以下のJSONのみを返してください（コードブロック不要）:
{
${exampleLines}
}

ルール：
1. 画像にテナントが見当たらない場合はそのキーを省略する
2. 対象テナント一覧にないテナントは出力しない
3. 集計行・ビル全体の行は無視する`;
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(buildPrompt());
    toast.success("AIへの指示文をコピーしました。Gemini等に貼り付けてください。");
  };

  // テナント一覧を読み込む
  useEffect(() => {
    async function load() {
      setLoading(true);
      const tenants = await getTenants();
      const items: TenantItem[] = tenants.map(t => ({
        tenantId: t.id,
        roomName: t.roomName,
        sortOrder: t.sortOrder,
        light: t.settings.light.hasMeter
          ? { current: '', baseFee: t.settings.light.baseFee, unitPrice: t.settings.light.unitPrice }
          : null,
        power: t.settings.power.hasMeter
          ? { current: '', baseFee: t.settings.power.baseFee, unitPrice: t.settings.power.unitPrice }
          : null,
        water: t.settings.water.hasMeter
          ? { current: '', baseFee: t.settings.water.baseFee, unitPrice: t.settings.water.unitPrice }
          : null,
      }));
      setData(items);
      setLoading(false);
    }
    load();
  }, []);

  // OCR抽出値をフォームに反映
  useEffect(() => {
    if (extractedValues.length > 0 && data.length > 0) {
      setData(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        let idx = 0;
        next.forEach((t: TenantItem) => {
          if (t.light && idx < extractedValues.length) t.light.current = extractedValues[idx++];
          if (t.power && idx < extractedValues.length) t.power.current = extractedValues[idx++];
          if (t.water && idx < extractedValues.length) t.water.current = extractedValues[idx++];
        });
        return next;
      });
      clearExtractedValues();
    }
  }, [extractedValues, data.length, clearExtractedValues]);

  const handlePasteApply = () => {
    const trimmed = pastedText.trim();

    // まず名前付きJSON形式として解析を試みる
    try {
      const jsonStr = trimmed.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        // テナント名で照合して反映
        const matchCount = Object.keys(parsed).filter(name =>
          data.some(t => t.roomName === name)
        ).length;

        setData(prev => {
          const next: TenantItem[] = JSON.parse(JSON.stringify(prev));
          next.forEach(t => {
            const vals = parsed[t.roomName];
            if (!vals) return; // 画像になければスキップ
            if (t.light && vals.light !== undefined) t.light.current = vals.light;
            if (t.power && vals.power !== undefined) t.power.current = vals.power;
            if (t.water && vals.water !== undefined) t.water.current = vals.water;
          });
          return next;
        });

        setPastedText("");
        setIsPasteDialogOpen(false);
        toast.success(`${matchCount}件のテナントに値を反映しました。内容をご確認ください。`);
        return;
      }
    } catch {
      // JSONパース失敗 → 旧来の数値配列方式にフォールバック
    }

    // フォールバック：数値を順番に抽出（旧方式）
    const numbers = trimmed.match(/\d+(\.\d+)?/g);
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

  const handleCurrentChange = (tenantIndex: number, type: InfraType, value: string) => {
    const next = [...data];
    const val = value === '' ? '' : Number(value);
    const infra = next[tenantIndex][type];
    if (infra) infra.current = val;
    setData(next);
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
        if (data[targetIndex]?.[type] !== null) { found = true; break; }
      }
      if (found) {
        const key = `${targetIndex}-${type}`;
        inputRefs.current[key]?.focus();
        inputRefs.current[key]?.select();
      }
    }
  };

  // 前月レコードとして保存（前月指針 = 0、当月指針 = 入力値）
  const handleSave = async () => {
    try {
      const records: MonthlyBillingRecord[] = data.map(t => {
        const build = (infra: InfraData | null) => {
          if (!infra) return { previousValue: 0, currentValue: 0, usage: 0, calculatedFee: 0 };
          const cur = typeof infra.current === 'number' ? infra.current : 0;
          // 初期設定なので前月指針は0、使用量・料金も0（ベースラインとして保存）
          return { previousValue: 0, currentValue: cur, usage: 0, calculatedFee: 0 };
        };
        return {
          id: '',
          billingMonth: targetMonth,
          tenantId: t.tenantId,
          readings: {
            light: build(t.light),
            power: build(t.power),
            water: build(t.water),
          },
          totalAmount: 0,
          status: 'APPROVED' as const,
        };
      });

      await saveBillingRecordsBatch(records);
      toast.success(`${targetMonth} の初期指針値を登録しました。${startMonth} から検針入力を開始できます。`);
    } catch (err) {
      console.error(err);
      toast.error("保存に失敗しました。");
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">初期セットアップ</h1>
        <p className="text-gray-500 mt-1">利用開始月の前月指針値を登録します。</p>
      </div>

      {/* 利用開始月の選択 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-8">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">利用開始月</label>
            <input
              type="month"
              value={startMonth}
              onChange={e => setStartMonth(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="text-sm text-gray-600 bg-white border rounded-md px-4 py-2">
            <span className="text-gray-400">登録先：</span>
            <span className="font-bold text-blue-700 ml-1">{targetMonth}</span>
            <span className="text-gray-400 ml-1">（前月）のレコードとして保存</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          ※ 登録した指針値が、{startMonth} の検針入力時に「前月指針」として表示されます。
        </p>
      </div>

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 flex justify-between items-center py-3 mb-4">
        <p className="text-sm font-semibold text-gray-600">
          各テナントの <span className="text-blue-700">{targetMonth}</span> 時点の指針値を入力してください
        </p>
        <div className="flex gap-2">
          <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm">AIの結果を一括入力</Button>} />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>テキストから数値を抽出</DialogTitle>
                <DialogDescription>
                  LLM等の解析結果をそのまま貼り付けてください。
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
                  placeholder="ここにペースト..."
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsPasteDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handlePasteApply}>反映する</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave}>初期指針値を保存</Button>
        </div>
      </div>

      {/* テナント一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          読み込み中...
        </div>
      ) : (
        <div className="space-y-6">
          {data.map((tenant, index) => (
            <div key={tenant.tenantId} className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-gray-100">
                <h3 className="text-base font-bold text-primary">{tenant.roomName}</h3>
              </div>
              <div className="p-4">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-16">種別</TableHead>
                      <TableHead>{targetMonth} 時点の指針値</TableHead>
                      <TableHead className="text-xs text-gray-400 font-normal">
                        （{startMonth} の前月指針として使われます）
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(['light', 'power', 'water'] as InfraType[]).map(type => {
                      const infra = tenant[type];
                      if (!infra) return null;
                      const key = `${index}-${type}`;
                      return (
                        <TableRow key={type}>
                          <TableCell className="font-semibold text-gray-600">
                            {infraLabels[type]}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={infra.current}
                              onChange={e => handleCurrentChange(index, type, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, index, type)}
                              ref={el => { if (el) inputRefs.current[key] = el; }}
                              className="h-9 w-40 text-right"
                              placeholder="指針値を入力"
                            />
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button size="lg" onClick={handleSave} className="px-8">
            初期指針値を保存する
          </Button>
        </div>
      )}
    </div>
  );
}
