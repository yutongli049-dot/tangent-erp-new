"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type CreatableComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
};

/** 支持下拉选择 + 手动键入的可创建组合框 */
export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder = "选择或输入…",
  className,
  inputClassName,
  name,
  id,
  disabled,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const mergedOptions = useMemo(() => {
    const set = new Set<string>();
    for (const opt of options) {
      const trimmed = opt?.trim();
      if (trimmed) set.add(trimmed);
    }
    if (value?.trim()) set.add(value.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return mergedOptions;
    return mergedOptions.filter((o) => o.toLowerCase().includes(q));
  }, [mergedOptions, inputValue]);

  const commit = (next: string) => {
    const trimmed = next.trim();
    setInputValue(trimmed);
    onChange(trimmed);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} readOnly />}
      <Input
        id={id}
        disabled={disabled}
        value={inputValue}
        placeholder={placeholder}
        autoComplete="off"
        className={cn("h-12 rounded-xl bg-white font-medium", inputClassName)}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && open) {
            e.preventDefault();
            commit(inputValue);
          }
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50",
                opt === value && "bg-indigo-50/60 text-indigo-700"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(opt);
              }}
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  opt === value ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="truncate">{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
