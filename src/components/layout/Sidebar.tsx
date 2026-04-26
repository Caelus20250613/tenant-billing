"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, PencilLine, FileText, LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/src/lib/firebase";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    // クライアントサイドで現在の年月を取得 (YYYY-MM)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${year}-${month}`);

    // Firebase Auth のログインユーザーを取得
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // サーバーサイド・初回マウント時はフォールバック
  const billingInputHref = currentMonth ? `/billing/input/${currentMonth}` : "/billing/input";
  const billingSummaryHref = currentMonth ? `/billing/summary/${currentMonth}` : "/billing/summary";

  const navItems = [
    { name: "テナントマスタ管理", href: "/tenants", icon: Building2 },
    { name: "検針データ入力", href: billingInputHref, icon: PencilLine },
    { name: "請求書一覧・出力", href: billingSummaryHref, icon: FileText },
  ];

  const getBaseRoute = (href: string) => {
    if (href.startsWith("/billing/input")) return "/billing/input";
    if (href.startsWith("/billing/summary")) return "/billing/summary";
    return href;
  };

  return (
    <div className="w-64 bg-gray-900 h-screen flex flex-col text-white flex-shrink-0 shadow-xl">
      <div className="p-6 flex items-center gap-3 border-b border-gray-800">
        <LayoutDashboard className="w-7 h-7 text-blue-400" />
        <h1 className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
          ビル請求システム
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-6">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(getBaseRoute(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors ${
                isActive 
                  ? "bg-blue-600/90 text-white shadow-sm" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-blue-100" : "text-gray-400"}`} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <div className="text-xs text-gray-500 mb-1">ログインユーザー</div>
        <div className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs flex-shrink-0">
              {currentUser?.displayName?.[0] ?? currentUser?.email?.[0]?.toUpperCase() ?? "管"}
            </div>
            <span className="truncate text-gray-200 text-xs">
              {currentUser?.displayName ?? currentUser?.email ?? "システム管理者"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-1.5 rounded transition-colors flex-shrink-0"
            title="ログアウト"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
