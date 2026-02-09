"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/contexts/BusinessContext";
import { createBooking } from "../actions"; // 确保引入了创建函数
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar"; // ✅ 核心修复：加上导航栏
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Calendar, Clock, MapPin, User, BookOpen } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // 如果你没装 sonner，可以用 alert 代替

export default function NewBookingPage() {
  const router = useRouter();
  const { currentBusinessId, currentLabel } = useBusiness();
  const [loading, setLoading] = useState(false);
  
  // 表单状态
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState("1");
  const [location, setLocation] = useState("线上");

  // 加载学生列表
  useEffect(() => {
    async function fetchStudents() {
      if (!currentBusinessId) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("students")
        .select("id, name, subject")
        .eq("business_unit_id", currentBusinessId)
        .order("name");
      
      if (data) setStudents(data);
    }
    fetchStudents();
  }, [currentBusinessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !date || !time) {
      alert("请填写完整信息");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("date", date);
    formData.append("time", time);
    formData.append("duration", duration);
    formData.append("location", location);
    formData.append("businessId", currentBusinessId);

    const res = await createBooking(null, formData);
    setLoading(false);

    if (res?.error) {
      alert("创建失败: " + res.error);
    } else {
      router.push("/bookings"); // 成功后跳转回列表
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar /> {/* ✅ 导航栏已就位 */}

      <div className="mx-auto max-w-xl px-6 py-8">
        {/* 顶部面包屑 */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/bookings"
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-[1px] hover:text-indigo-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">新建课程预约</h1>
            <p className="text-xs font-medium text-slate-400">
              为 <span className="text-indigo-600 font-bold">{currentLabel}</span> 排课
            </p>
          </div>
        </div>

        {/* 表单卡片 */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
             <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
               <Calendar className="h-4 w-4 text-indigo-500" /> 填写课程信息
             </h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* 1. 选择学生 */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">学员 (Student)</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger className="h-12 bg-white border-slate-200">
                    <SelectValue placeholder="选择学员..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{s.name}</span>
                          {s.subject && <span className="text-xs text-slate-400">({s.subject})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. 日期与时间 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">日期 (Date)</Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      className="h-12 pl-10 bg-white border-slate-200" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                    <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">开始时间 (Time)</Label>
                  <div className="relative">
                    <Input 
                      type="time" 
                      className="h-12 pl-10 bg-white border-slate-200" 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                    <Clock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 3. 时长与地点 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">时长 (Hours)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.5"
                      className="h-12 bg-white border-slate-200 pr-8 font-bold text-slate-700" 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                    <span className="absolute right-3 top-3.5 text-xs font-bold text-slate-400">h</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">地点 (Location)</Label>
                  <div className="relative">
                     <Input 
                        placeholder="线上 / 地址..." 
                        className="h-12 pl-10 bg-white border-slate-200"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                      <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-bold shadow-sm"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" /> : "确认预约 (Confirm Booking)"}
                </Button>
              </div>

            </form>
          </div>
        </Card>
      </div>
    </main>
  );
}