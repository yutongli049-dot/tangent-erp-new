"use client";

import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// 模拟数据 (Level 1 & Level 2)
const groups = [
  {
    label: "Companies",
    teams: [{ label: "Tangent Group (All)", value: "all" }],
  },
  {
    label: "Business Units",
    teams: [
      { label: "Sine Studio (驾校)", value: "sine" },
      { label: "CuS Academy (教培)", value: "cus" },
    ],
  },
];

export default function BusinessSwitcher() {
  const [selectedTeam, setSelectedTeam] = React.useState(groups[1].teams[0]);

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
          <span className="truncate">{selectedTeam.label}</span>

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
        {groups.map((group, gi) => (
          <React.Fragment key={group.label}>
            <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {group.label}
            </DropdownMenuLabel>

            {group.teams.map((team) => {
              const active = selectedTeam.value === team.value;

              return (
                <DropdownMenuItem
                  key={team.value}
                  onSelect={() => setSelectedTeam(team)}
                  className={`
                    flex cursor-pointer items-center
                    rounded-xl px-2.5 py-2 text-[13px]
                    text-slate-700 outline-none
                    transition-colors
                    hover:bg-slate-50 focus:bg-slate-50
                    ${active ? "bg-indigo-50/70 text-slate-900" : ""}
                  `}
                >
                  <span className="truncate">{team.label}</span>

                  {active && (
                    <Check className="ml-auto h-4 w-4 text-indigo-600" />
                  )}
                </DropdownMenuItem>
              );
            })}

            {gi !== groups.length - 1 && (
              <DropdownMenuSeparator className="my-2 bg-slate-200/60" />
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
