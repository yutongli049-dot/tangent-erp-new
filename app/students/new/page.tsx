"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createStudent } from "../actions"; 
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Wallet, GraduationCap } from "lucide-react";

export default function NewStudentPage() {
  const { currentBusinessId } = useBusiness();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [hourlyRate, setHourlyRate] = useState("70");
  const [balance, setBalance] = useState("0");
  const [level, setLevel] = useState("Year 11"); // ✅ 默认值

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("businessId", currentBusinessId);
    formData.append("level", level); // ✅ 手动追加 level

    const res = await createStudent(null, formData);
    setLoading(false);

    if (res?.error) {
      alert("创建失败: " + res.error);
    } else {
      router.push("/students");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold text-slate-900">录入新学员</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>学员姓名 (Name)</Label>
              <Input name="name" placeholder="例如: Michael Wang" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>学员编号 (Student ID)</Label>
              <Input name="studentId" placeholder="例如: S2026001" className="h-11" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-indigo-500" /> 账户配置
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>课时费率 (Hourly Rate)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">$</span>
                  <Input 
                    name="hourlyRate" 
                    type="number" 
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="h-11 pl-7" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>初始课时 (Initial Balance)</Label>
                <div className="relative">
                  <Input 
                    name="balance" 
                    type="number" 
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="h-11" 
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400 font-bold">Hrs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>学习科目 (Subject)</Label>
              <Input name="subject" placeholder="例如: NCEA L1 Math" className="h-11" />
            </div>

            {/* ✅ 新增：年级选择 */}
            <div className="space-y-2">
              <Label>当前年级 (Level)</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="选择年级..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Year 9">Year 9</SelectItem>
                  <SelectItem value="Year 10">Year 10</SelectItem>
                  <SelectItem value="Year 11">Year 11</SelectItem>
                  <SelectItem value="Year 12">Year 12</SelectItem>
                  <SelectItem value="Year 13">Year 13</SelectItem>
                  <SelectItem value="University">University</SelectItem>
                  <SelectItem value="Adult">Adult</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>负责老师 (Teacher)</Label>
            <Input name="teacher" placeholder="例如: Henry Liu" className="h-11" />
          </div>

          <Button type="submit" className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : "确认创建档案 (Create Profile)"}
          </Button>
        </form>
      </Card>
    </main>
  );
}