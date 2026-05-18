"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getToken, clearToken } from "@/lib/api";
import { Users, LogOut, LayoutDashboard, BarChart2, KanbanSquare, GraduationCap, BookOpen, Wallet, LineChart, Send } from "lucide-react";

function getAdminRole(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("mea_admin_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.rol ?? null;
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoginPage && !getToken()) {
      router.replace("/admin/login");
    } else {
      setRol(getAdminRole());
    }
  }, [isLoginPage, router]);

  function handleLogout() {
    clearToken();
    router.push("/admin/login");
  }

  if (isLoginPage) return <>{children}</>;

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/leads", icon: Users, label: "Leads" },
    { href: "/admin/crm", icon: KanbanSquare, label: "CRM" },
    { href: "/admin/alumnos", icon: GraduationCap, label: "Alumnos" },
    { href: "/admin/ediciones", icon: BookOpen, label: "Ediciones" },
    { href: "/admin/metricas", icon: BarChart2, label: "Métricas" },
    { href: "/admin/finanzas", icon: Wallet, label: "Finanzas" },
    { href: "/admin/marketing", icon: Send, label: "Marketing" },
    ...(rol === "SUPER_ADMIN" ? [{ href: "/admin/ceo", icon: LineChart, label: "CEO" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A2540] flex flex-col shrink-0 fixed top-0 left-0 h-full z-10">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00C4B4]/20 border border-[#00C4B4]/30 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-[#00C4B4] font-bold text-xs">M</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">MEA Admin</p>
              <p className="text-slate-500 text-xs mt-0.5">Panel de gestión</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
            Principal
          </p>
          {navItems.map((item, i) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={i}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#00C4B4]/10 text-[#00C4B4] border border-[#00C4B4]/15"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
