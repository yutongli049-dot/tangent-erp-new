"use client";

import { useState } from "react";
import { topUpStudent } from "../actions"; // 引入刚才写的后端函数
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Plus, X, Loader2 } from "lucide-react";

interface TopUpButtonProps {
  studentId: string;
  studentName: string;
  businessId: string;
}

export function TopUpButton({ studentId, studentName, businessId }: TopUpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 表单状态
  const [amount, setAmount] = useState(""); // 充多少钱
  const [hours, setHours] = useState("");   // 加多少课时

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !hours) return;

    setIsLoading(true);
    
    const result = await topUpStudent(
      studentId, 
      parseFloat(amount), 
      parseFloat(hours), 
      businessId
    );

    setIsLoading(false);

    if (result.error) {
      alert(result.error);
    } else {
      setIsOpen(false);
      setAmount("");
      setHours("");
      // 页面数据会自动刷新 (由 Server Action 的 revalidatePath 触发)
    }
  };

  return (
    <>
      {/* 触发按钮 */}
      <Button 
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl bg-indigo-50 font-bold text-indigo-700 shadow-none hover:bg-indigo-100"
      >
        <Wallet className="mr-2 h-4 w-4" />
        充值 / Top Up
      </Button>

      {/* 手写 Modal (确保无需额外安装组件库也能用) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">学员充值</h3>
                <p className="text-xs text-slate-500">正在为 {studentName} 增加余额</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleTopUp} className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-5">
                {/* 1. 收多少钱 */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    收款金额 ($)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-7 h-12 text-lg font-bold text-emerald-600 bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500/20"
                      autoFocus
                    />
                  </div>
                </div>

                {/* 2. 加多少课时 */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    增加课时 (h)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">+</span>
                    <Input
                      type="number"
                      step="0.5"
                      required
                      placeholder="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="pl-7 h-12 text-lg font-bold text-indigo-600 bg-indigo-50/30 border-indigo-100 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-indigo-600 text-base font-bold shadow-md hover:bg-indigo-700 active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "确认充值 (Confirm)"}
                </Button>
                <p className="mt-3 text-center text-xs text-slate-400">
                  这将自动记录一笔收入并更新学员余额
                </p>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}