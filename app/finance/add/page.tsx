"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/contexts/BusinessContext";
import { createTransaction } from "../actions";
import { createClient } from "@/lib/supabase/client"; // ✅ 引入客户端 SDK

import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function AddTransactionPage() {
  const router = useRouter();
  const { currentBusinessId, currentLabel } = useBusiness();
  const supabase = createClient(); // ✅ 初始化客户端
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // 表单状态
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [proofUrl, setProofUrl] = useState(""); // ✅ 存储上传后的 URL

  // ✅ 处理图片上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${currentBusinessId}/${fileName}`; // 按公司分文件夹

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file);

    if (uploadError) {
      alert("图片上传失败: " + uploadError.message);
      setUploading(false);
      return;
    }

    // 获取公开访问链接
    const { data: { publicUrl } } = supabase.storage
      .from("receipts")
      .getPublicUrl(filePath);

    setProofUrl(publicUrl);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) {
      alert("请填写金额和分类");
      return;
    }

    setIsLoading(true);

    const result = await createTransaction({
      amount: parseFloat(amount),
      type,
      category,
      date,
      description,
      businessId: currentBusinessId,
      proofUrl, // ✅ 提交图片 URL
    });

    setIsLoading(false);

    if (result.error) {
      alert(`保存失败: ${result.error}`);
    } else {
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-xl px-6 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-[1px] hover:text-indigo-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">记一笔</h1>
            <p className="text-xs font-medium text-slate-400">
              为 <span className="text-indigo-600 font-bold">{currentLabel}</span> 记账
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={type} onValueChange={(v) => setType(v as "income" | "expense")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100/80 p-1">
                <TabsTrigger value="expense" className="rounded-lg text-xs font-semibold data-[state=active]:text-rose-600">支出</TabsTrigger>
                <TabsTrigger value="income" className="rounded-lg text-xs font-semibold data-[state=active]:text-emerald-600">收入</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">金额 (Amount)</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-xl font-bold text-slate-400">$</span>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-16 rounded-xl border-slate-200/70 bg-slate-50/50 pl-9 text-3xl font-bold tracking-tight text-slate-900 focus-visible:bg-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">分类</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200/70 bg-slate-50/50 font-medium text-slate-700">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    {/* ✅ IRD 推荐分类 */}
                    <SelectItem value="Motor Vehicle">🚗 车辆开销 (油/修/养)</SelectItem>
                    <SelectItem value="Rent">🏠 房租/场地</SelectItem>
                    <SelectItem value="Equipment">🔧 器材/小设备</SelectItem>
                    <SelectItem value="Marketing">📢 广告推广</SelectItem>
                    <SelectItem value="Fixed Asset">🏗️ 固定资产</SelectItem>
                    <SelectItem value="General">📦 其他杂费</SelectItem>
                    <SelectItem value="Income">💰 营业收入</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">日期</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl border-slate-200/70 bg-slate-50/50 font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">备注</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：BP 加油 40L..."
                className="resize-none rounded-xl border-slate-200/70 bg-slate-50/50 text-sm font-medium text-slate-700"
                rows={3}
              />
            </div>

            {/* ✅ 激活的凭证上传区域 */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">凭证 (Receipt)</Label>
              <div className={`relative flex w-full items-center justify-center rounded-xl border border-dashed ${proofUrl ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50/50'} py-6 transition-all hover:bg-slate-50`}>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />

                <div className="flex flex-col items-center gap-2 text-center">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  ) : proofUrl ? (
                    <>
                      <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-emerald-600">已上传成功 (点击可替换)</span>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                        <Camera className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-slate-500">点击拍照或上传图片</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || uploading}
              className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-bold hover:bg-indigo-700"
            >
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "确认保存"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}