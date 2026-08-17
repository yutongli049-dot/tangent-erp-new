"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Home as HomeIcon,
  Users,
  Calendar as CalendarIcon,
  FileBarChart,
  PenLine,
  Plus,
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { isDrivingSchoolBusiness } from "@/lib/business";

function TabItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 group active:scale-95 transition-transform ${
        isActive ? "text-indigo-600" : "text-slate-400"
      }`}
    >
      <div
        className={`h-6 w-6 ${
          isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
        } transition-colors`}
      >
        <Icon className="h-full w-full" />
      </div>
      <span
        className={`text-[10px] font-medium ${
          isActive ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-800"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export function MobileDock() {
  const pathname = usePathname();
  const { currentBusinessId } = useBusiness();
  const driving = isDrivingSchoolBusiness(currentBusinessId);

  const isHome = pathname === "/";
  const isStudents = pathname.startsWith("/students");
  const isBookings = pathname.startsWith("/bookings");
  const isFinance = pathname === "/finance" || pathname.startsWith("/finance/transactions");
  const isFinanceAdd = pathname.startsWith("/finance/add");

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/60 bg-white/95 px-6 pb-safe pt-1 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <TabItem href="/" icon={HomeIcon} label="首页" isActive={isHome} />
        <TabItem href="/students" icon={Users} label="学生" isActive={isStudents} />

        {driving ? (
          <Link
            href="/bookings/quick"
            className="-mt-8 flex flex-col items-center active:scale-90 transition-transform"
            aria-label="极速排课"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-50 bg-indigo-600 text-white shadow-lg shadow-indigo-400/50">
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <span className="mt-0.5 text-[10px] font-black tracking-tight text-indigo-600">
              极速排课
            </span>
          </Link>
        ) : (
          <Link href="/finance/add" className="-mt-8 active:scale-90 transition-transform">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-50 bg-slate-900 text-white shadow-lg shadow-slate-400/50">
              <PenLine className="h-6 w-6" />
            </div>
          </Link>
        )}

        <TabItem href="/bookings" icon={CalendarIcon} label="排课" isActive={isBookings && !pathname.startsWith("/bookings/quick") && !pathname.startsWith("/bookings/new")} />
        <TabItem
          href="/finance"
          icon={FileBarChart}
          label="报表"
          isActive={isFinance || (!driving && isFinanceAdd)}
        />
      </div>
    </div>
  );
}
