"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createStudent } from "../actions"; 
import { useBusiness } from "@/contexts/BusinessContext";
import { Navbar } from "@/components/Navbar"; 
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, ArrowLeft, Wallet, GraduationCap, User, BookOpen, 
  Home as HomeIcon, Users, Calendar as CalendarIcon, FileBarChart, PenLine 
} from "lucide-react";
import { toast } from "sonner"; 

// 底部导航项
const TabItem = ({ href, icon: Icon, label, isActive }: any) => (
  <Link href={href} className={`flex flex-col items-center justify-center gap-1 flex-1 active:scale-95 transition-transform py-2 group ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
    <div className={`h-6 w-6 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
      <Icon className="h-full w-full" />
    </div>
    <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'}`}>{label}</span>
  </Link>
);

export default function NewStudentPage() {
  const { currentBusinessId } = useBusiness();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [hourlyRate, setHourlyRate] = useState("70");
  const [balance, setBalance] = useState("0");
  const [level, setLevel] = useState("Year 11");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("businessId", currentBusinessId);
    formData.append("level", level);

    const res = await createStudent(null, formData);
    setLoading(false);

    if (res?.error) {
      toast.error("创建失败: " + res.error);
    } else {
      toast.success("学员档案创建成功");
      router.push("/students");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      
      {/* 1. Desktop Navbar */}
      <div className="hidden md:block"><Navbar /></div>

      <main className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-8">
        
        {/* 2. Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-slate-200 shadow-sm hover:bg-slate-50" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-900">录入新学员</h1>
            <p className="text-xs text-slate-400 font-medium">Create New Profile</p>
          </div>
        </div>

        {/* 3. Form Card */}
        <Card className="p-6 md:p-8 rounded-3xl shadow-sm border-slate-200 bg-white">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                 <User className="h-4 w-4 text-indigo-500" /> 基本信息
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">学员姓名 (Name)</Label>
                  <Input name="name" placeholder="例如: Michael Wang" required className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">学员编号 (Student ID)</Label>
                  <Input name="studentId" placeholder="例如: S2026001" className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500" />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Section 2: Financial Config */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                 <Wallet className="h-4 w-4 text-emerald-500" /> 账户配置
               </div>
               <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">课时费率 ($/h)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <Input 
                        name="hourlyRate" 
                        type="number" 
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="h-11 pl-7 rounded-xl border-slate-200 bg-white" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">初始课时 (Balance)</Label>
                    <div className="relative">
                      <Input 
                        name="balance" 
                        type="number" 
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        className="h-11 pr-10 rounded-xl border-slate-200 bg-white" 
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Hrs</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Section 3: Academic Info */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                 <GraduationCap className="h-4 w-4 text-indigo-500" /> 学术信息
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">当前年级 (Level)</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
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
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">学习科目 (Subject)</Label>
                    <Input name="subject" placeholder="例如: NCEA L1 Math" className="h-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs text-slate-500">负责老师 (Teacher)</Label>
                    <Input name="teacher" placeholder="例如: Henry Liu" className="h-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
               </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 mt-4" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "确认创建档案"}
            </Button>
          </form>
        </Card>

      </main>

      {/* 4. Mobile Bottom Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/60 pb-safe pt-1 px-6 z-50">
        <div className="flex justify-between items-center">
          <TabItem href="/" icon={HomeIcon} label="首页" isActive={false} />
          <TabItem href="/students" icon={Users} label="学生" isActive={true} />
          <Link href="/finance/add" className="active:scale-90 transition-transform -mt-8">
             <div className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-400/50 border-4 border-slate-50">
               <PenLine className="h-6 w-6" />
             </div>
          </Link>
          <TabItem href="/bookings" icon={CalendarIcon} label="排课" isActive={false} />
          <TabItem href="/finance" icon={FileBarChart} label="报表" isActive={false} />
        </div>
      </div>
    </div>
  );
}