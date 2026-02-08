"use client";

import { useState } from "react";
import { topUpStudent } from "../actions"; // 确保引入正确
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TopUpButton({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleTopUp = async () => {
    if (!amount) return;
    setLoading(true);

    // ✅ 修复核心报错：严格只传 2 个参数 (studentId, amount)
    // 后端函数定义是: export async function topUpStudent(studentId: string, amount: number)
    const res = await topUpStudent(studentId, Number(amount));

    setLoading(false);

    if (res?.error) {
      alert("充值失败: " + res.error);
    } else {
      setOpen(false);
      setAmount("");
      router.refresh(); // 刷新页面显示新余额
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
          <CreditCard className="h-4 w-4" />
          充值课时 (Top Up)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Plus className="h-5 w-5" /> 增加课时余额
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-right">
              充值数量 (Hours to add)
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="例如: 10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3 h-12 text-lg font-bold pr-12"
              />
              <span className="absolute right-4 top-3 text-slate-400 font-bold text-sm">Hrs</span>
            </div>
            <p className="text-[10px] text-slate-500">
              * 这将直接增加学员的可用课时余额，不涉及现金流记录。
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleTopUp} disabled={loading || !amount} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "确认充值"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}