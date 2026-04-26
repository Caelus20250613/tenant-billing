"use client";

import { useState, useEffect } from "react";
import { Tenant } from "@/src/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTenants, createTenant, updateTenant, deleteTenant, seedTenants } from "@/src/lib/firestore";
import { TENANT_SEED_DATA } from "@/src/lib/tenantSeedData";
import { toast } from "sonner";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadTenants = async () => {
    const data = await getTenants();
    setTenants(data);
    setSelectedIds(new Set()); // 再読み込み時に選択状態をリセット
  };

  useEffect(() => {
    loadTenants();
  }, []);

  // 全選択 / 全解除
  const handleToggleAll = () => {
    if (selectedIds.size === tenants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tenants.map(t => t.id)));
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const names = tenants
      .filter(t => selectedIds.has(t.id))
      .map(t => t.roomName)
      .join("、");
    if (!confirm(`以下の${selectedIds.size}件を削除しますか？\n${names}\n\nこの操作は取り消せません。`)) return;
    try {
      await Promise.all([...selectedIds].map(id => deleteTenant(id)));
      toast.success(`${selectedIds.size}件のテナントを削除しました`);
      await loadTenants();
    } catch (error) {
      console.error(error);
      toast.error("削除に失敗しました");
    }
  };

  // 個別削除
  const handleDeleteClick = async (tenant: Tenant) => {
    if (!confirm(`「${tenant.roomName}」を削除しますか？\nこの操作は取り消せません。`)) return;
    try {
      await deleteTenant(tenant.id);
      toast.success(`「${tenant.roomName}」を削除しました`);
      await loadTenants();
    } catch (error) {
      console.error(error);
      toast.error("削除に失敗しました");
    }
  };

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsDialogOpen(true);
  };

  const handleAddClick = () => {
    setEditingTenant(null);
    setIsDialogOpen(true);
  };

  const handleSeedData = async () => {
    if (!confirm(`初期データ（${TENANT_SEED_DATA.length}件）を一括登録します。よろしいですか？`)) return;
    try {
      await seedTenants(TENANT_SEED_DATA);
      toast.success(`${TENANT_SEED_DATA.length}件のテナントを登録しました`);
      await loadTenants();
    } catch (error) {
      console.error(error);
      toast.error("初期データの登録に失敗しました");
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomName = formData.get("roomName") as string;
    const billingName = formData.get("billingName") as string;
    const isActive = formData.get("isActive") === "on";

    const settings = {
      light: {
        hasMeter: true,
        baseFee: Number(formData.get("lightBaseFee")),
        unitPrice: Number(formData.get("lightUnitPrice")),
      },
      power: {
        hasMeter: true,
        baseFee: Number(formData.get("powerBaseFee")),
        unitPrice: Number(formData.get("powerUnitPrice")),
      },
      water: {
        hasMeter: true,
        baseFee: Number(formData.get("waterBaseFee")),
        unitPrice: Number(formData.get("waterUnitPrice")),
      },
    };

    try {
      if (editingTenant) {
        await updateTenant(editingTenant.id, { roomName, billingName, isActive, settings });
      } else {
        await createTenant({ roomName, billingName, isActive, sortOrder: tenants.length + 1, settings });
      }
      setIsDialogOpen(false);
      await loadTenants();
    } catch (error) {
      console.error("Failed to save tenant:", error);
    }
  };

  const allChecked = tenants.length > 0 && selectedIds.size === tenants.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < tenants.length;

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">テナントマスタ管理</h1>
        <div className="flex gap-2">
          {tenants.length === 0 && (
            <Button variant="outline" onClick={handleSeedData}>
              初期データを一括登録（{TENANT_SEED_DATA.length}件）
            </Button>
          )}
          <Button onClick={handleAddClick}>新規テナント追加</Button>
        </div>
      </div>

      {/* 一括削除バー：1件以上選択時に表示 */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-red-700 font-medium">
            {selectedIds.size}件を選択中
          </span>
          <Button
            size="sm"
            onClick={handleBulkDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            選択した{selectedIds.size}件を削除
          </Button>
        </div>
      )}

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              {/* 全選択チェックボックス */}
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked; }}
                  onChange={handleToggleAll}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
              </TableHead>
              <TableHead className="w-[150px] font-semibold text-gray-700">部屋名</TableHead>
              <TableHead className="w-[150px] font-semibold text-gray-700">請求先名</TableHead>
              <TableHead className="w-[100px] font-semibold text-gray-700">稼働状況</TableHead>
              <TableHead className="font-semibold text-gray-700">電灯 基本/単価</TableHead>
              <TableHead className="font-semibold text-gray-700">動力 基本/単価</TableHead>
              <TableHead className="font-semibold text-gray-700">水道 基本/単価</TableHead>
              <TableHead className="text-right font-semibold text-gray-700 w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow
                key={tenant.id}
                className={`transition-colors hover:bg-gray-50/50 ${selectedIds.has(tenant.id) ? "bg-red-50/40" : ""}`}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tenant.id)}
                    onChange={() => handleToggleOne(tenant.id)}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                  />
                </TableCell>
                <TableCell className="font-medium">{tenant.roomName}</TableCell>
                <TableCell className="text-gray-600">{tenant.billingName || "-"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    tenant.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {tenant.isActive ? "稼働中" : "空室"}
                  </span>
                </TableCell>
                <TableCell>
                  {tenant.settings.light.hasMeter
                    ? `¥${tenant.settings.light.baseFee.toLocaleString()} / ¥${tenant.settings.light.unitPrice}`
                    : "-"}
                </TableCell>
                <TableCell>
                  {tenant.settings.power.hasMeter
                    ? `¥${tenant.settings.power.baseFee.toLocaleString()} / ¥${tenant.settings.power.unitPrice}`
                    : "-"}
                </TableCell>
                <TableCell>
                  {tenant.settings.water.hasMeter
                    ? `¥${tenant.settings.water.baseFee.toLocaleString()} / ¥${tenant.settings.water.unitPrice}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(tenant)}>
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(tenant)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      削除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  テナントが登録されていません。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTenant ? "テナント設定を編集" : "新規テナント追加"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 pt-2">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="roomName" className="font-semibold text-gray-700">部屋名</Label>
                <Input
                  id="roomName"
                  name="roomName"
                  placeholder="例: 101号室"
                  defaultValue={editingTenant?.roomName || ""}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="billingName" className="font-semibold text-gray-700">請求先名 (任意)</Label>
                <Input
                  id="billingName"
                  name="billingName"
                  placeholder="空欄の場合は「部屋名」が使用されます"
                  defaultValue={editingTenant?.billingName || ""}
                />
                <p className="text-[11px] text-gray-500">※同じ名称のテナントは一つの請求書にまとめられます</p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  defaultChecked={editingTenant ? editingTenant.isActive : true}
                  className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <Label htmlFor="isActive" className="font-medium cursor-pointer text-gray-700">
                  現在稼働中のテナントとして設定する
                </Label>
              </div>
            </div>

            <div className="bg-gray-50/80 border p-5 rounded-lg space-y-5">
              <h3 className="text-sm font-bold text-gray-800 tracking-wider">メーター・料金基本設定</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 font-semibold uppercase">電灯 基本料金 (円)</Label>
                  <Input type="number" name="lightBaseFee" defaultValue={editingTenant?.settings.light.baseFee || 0} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 font-semibold uppercase">電灯 単価 (円/kWh)</Label>
                  <Input type="number" step="0.1" name="lightUnitPrice" defaultValue={editingTenant?.settings.light.unitPrice || 0} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 font-semibold uppercase">動力 基本料金 (円)</Label>
                  <Input type="number" name="powerBaseFee" defaultValue={editingTenant?.settings.power.baseFee || 0} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 font-semibold uppercase">動力 単価 (円/kWh)</Label>
                  <Input type="number" step="0.1" name="powerUnitPrice" defaultValue={editingTenant?.settings.power.unitPrice || 0} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 font-semibold uppercase">水道 基本料金 (円)</Label>
                  <Input type="number" name="waterBaseFee" defaultValue={editingTenant?.settings.water.baseFee || 0} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 font-semibold uppercase">水道 単価 (円/m³)</Label>
                  <Input type="number" step="0.1" name="waterUnitPrice" defaultValue={editingTenant?.settings.water.unitPrice || 0} />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">保存する</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
