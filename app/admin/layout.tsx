"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getToken, clearToken } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !getToken()) {
      router.replace("/admin/login");
    }
  }, [isLoginPage, router]);

  function handleLogout() {
    clearToken();
    router.push("/admin/login");
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0A2540] text-white px-6 py-4 flex items-center justify-between">
        <Link href="/admin" className="font-semibold text-lg">
          MEA Admin
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Cerrar sesión
        </button>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
