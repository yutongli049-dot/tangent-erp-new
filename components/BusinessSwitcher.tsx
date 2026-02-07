"use client";

import * as React from "react";
import { ChevronsUpDown, Check, Building2, Briefcase } from "lucide-react"; // 引入一些图标增加识别度
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useBusiness } from "@/contexts/BusinessContext"; // ✅ 引入 Context
import { BUSINESS_UNITS } from "@/lib/constants"; // ✅ 引入常量

export default function BusinessSwitcher() {
  // ✅ 使用全局状态，而不是本地 state
  const { currentBusinessId, switchBusiness, currentLabel } = useBusiness();

  // 分组逻辑
  const companies = BUSINESS_UNITS.filter(b => b.type === 'company');
  const units = BUSINESS_UNITS.filter(b => b.type === 'unit');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="
            h-10 w-[240px] justify-between rounded-xl
            border border-slate-200/70 bg-white/60
            px-3 text-[13px] font-medium text-slate-700
            shadow-[0_1px_2px_rgba(15,23,42,0.05)]
            transition-all
            hover:-translate-y-[1px] hover:bg-white hover:text-slate-900
            hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200/70
          "
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="
          w-[260px] rounded-2xl
          border border-slate-200/70 bg-white/95
          p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]
          backdrop-blur-xl
        "
      >
        {/* Group 1: Companies */}
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Companies
        </DropdownMenuLabel>
        {companies.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onSelect={() => switchBusiness(team.id)}
            className={`
              flex cursor-pointer items-center
              rounded-xl px-2.5 py-2 text-[13px]
              text-slate-700 outline-none
              transition-colors
              hover:bg-slate-50 focus:bg-slate-50
              ${currentBusinessId === team.id ? "bg-indigo-50/70 text-slate-900 font-medium" : ""}
            `}
          >
            <Building2 className="mr-2 h-4 w-4 text-slate-400" />
            <span className="truncate">{team.label}</span>
            {currentBusinessId === team.id && (
              <Check className="ml-auto h-4 w-4 text-indigo-600" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="my-2 bg-slate-200/60" />

        {/* Group 2: Business Units */}
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Business Units
        </DropdownMenuLabel>
        {units.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onSelect={() => switchBusiness(team.id)}
            className={`
              flex cursor-pointer items-center
              rounded-xl px-2.5 py-2 text-[13px]
              text-slate-700 outline-none
              transition-colors
              hover:bg-slate-50 focus:bg-slate-50
              ${currentBusinessId === team.id ? "bg-indigo-50/70 text-slate-900 font-medium" : ""}
            `}
          >
            <Briefcase className="mr-2 h-4 w-4 text-slate-400" />
            <span className="truncate">{team.label}</span>
            {currentBusinessId === team.id && (
              <Check className="ml-auto h-4 w-4 text-indigo-600" />
            )}
          </DropdownMenuItem>
        ))}

      </DropdownMenuContent>
    </DropdownMenu>
  );
}