"use client";

import { useState } from "react";
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

import { useEffect } from "react";
import { getTenants, createTenant, updateTenant } from "@/src/lib/firestore";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const loadTenants = async () => {
    const data = await getTenants();
    setTenants(data);
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsDialogOpen(true);
  };

  const handleAddClick = () => {
    setEditingTenant(null);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomName = formData.get("roomName") as string;
    const isActive = formData.get("isActive") === "on";
    
    const settings = {
      light: {
        hasMeter: true,
        baseFee: Number(formData.get("lightBaseFee")),
        unitPrice: Number(formData.get("lightUnitPrice"))
      },
      power: {
        hasMeter: true,
        baseFee: Number(formData.get("powerBaseFee")),
        unitPrice: Number(formData.get("powerUnitPrice"))
      },
      water: {
        hasMeter: true,
        baseFee: Number(formData.get("waterBaseFee")),
        unitPrice: Number(formData.get("waterUnitPrice"))
      }
    };

    try {
      if (editingTenant) {
        await updateTenant(editingTenant.id, { roomName, isActive, settings });
      } else {
        await createTenant({ roomName, isActive, sortOrder: tenants.length + 1, settings });
      }
      setIsDialogOpen(false);
      await loadTenants();
    } catch (error) {
      console.error("Failed to save tenant:", error);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">テナントマスタ管理</h1>
        <Button onClick={handleAddClick}>新規テナント追加</Button>
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="w-[150px] font-semibold text-gray-700">部屋名</TableHead>
              <TableHead className="w-[100px] font-semibold text-gray-700">稼働状況</TableHead>
              <TableHead className="font-semibold text-gray-700">電灯 基本/単価</TableHead>
              <TableHead className="font-semibold text-gray-700">動力 基本/単価</TableHead>
              <TableHead className="font-semibold text-gray-700">水道 基本/単価</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id} className="transition-colors hover:bg-gray-50/50">
                <TableCell className="font-medium">{tenant.roomName}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      tenant.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
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
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(tenant)}>
                    編集
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
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
