"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/contexts/BusinessContext";
import { createBooking } from "../actions";
import { createClient } from "@/lib/supabase/client";

import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, MapPin } from "lucide-react"; // ✅ 移除了 Clock 图标引入
import { toast } from "sonner"; 

export default function NewBookingPage() {
  const router = useRouter();
  const { currentBusinessId } = useBusiness();
  const supabase = createClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  
  // 表单状态
  const [selectedStudent, setSelectedStudent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState("1");
  const [location, setLocation] = useState("线上");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("Henry"); // 默认老师

  // 加载学生列表
  useEffect(() => {
    async function fetchStudents() {
      if (!currentBusinessId) return;
      const { data } = await supabase
        .from("students")
        .select("id, name, student_code, subject") 
        .eq("business_unit_id", currentBusinessId)
        .order("student_code", { ascending: true }); // ✅ 修改：按学号正序排列
      
      if (data) setStudents(data);
    }
    fetchStudents();
  }, [currentBusinessId]);

  // 当选择学生时，自动填充他的默认科目
  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId);
    const s = students.find(st => st.id === studentId);
    if (s && s.subject) {
      if (s.subject.toLowerCase().includes('math')) setSubject('Math');
      else if (s.subject.toLowerCase().includes('phys')) setSubject('Physics');
      else if (s.subject.toLowerCase().includes('chem')) setSubject('Chemistry');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !date || !time) {
      toast.warning("请补全课程信息");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("studentId", selectedStudent);
    formData.append("date", date);
    formData.append("time", time);
    formData.append("duration", duration);
    formData.append("location", location);
    formData.append("businessId", currentBusinessId);
    formData.append("subject", subject);
    formData.append("teacher", teacher);

    const result = await createBooking(null, formData);
    setIsLoading(false);

    if (result && result.error) {
      toast.error(`创建失败: ${result.error}`);
    } else {
      toast.success("课程预约已创建");
      router.push("/bookings"); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <div className="hidden md:block"><Navbar /></div>

      <main className="mx-auto max-w-xl px-4 md:px-6 py-6 md:py-8">
        
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-slate-200 shadow-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-900">新建课程预约</h1>
            <p className="text-xs text-slate-400 font-medium">New Session Booking</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Student Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">学员 (Student)</Label>
              <Select value={selectedStudent} onValueChange={handleStudentChange}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:ring-indigo-500">
                  <SelectValue placeholder="选择学员..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="py-3 font-medium">
                      <span className="font-mono text-slate-400 mr-2">
                        {s.student_code ? `[${s.student_code}]` : ''}
                      </span>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Subject & Teacher */}
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">科目 (Subject)</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white font-medium text-slate-900">
                    <SelectValue placeholder="选择科目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Math">Math (数学)</SelectItem>
                    <SelectItem value="Physics">Physics (物理)</SelectItem>
                    <SelectItem value="Chemistry">Chemistry (化学)</SelectItem>
                    <SelectItem value="Other">Other (其他)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">老师 (Teacher)</Label>
                <Select value={teacher} onValueChange={setTeacher}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white font-medium text-slate-900">
                    <SelectValue placeholder="选择老师" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Henry">Henry</SelectItem>
                    <SelectItem value="Yvetta">Yvetta</SelectItem>
                    <SelectItem value="Elvis">Elvis</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3. Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">日期 (Date)</Label>
                <div className="relative">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-white font-medium" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">开始时间 (Time)</Label>
                <div className="relative">
                   {/* ✅ 移除了重叠的 Clock Icon */}
                   <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-white font-medium" />
                </div>
              </div>
            </div>

            {/* 4. Duration & Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">时长 (Hours)</Label>
                <div className="relative">
                  <Input type="number" step="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-white font-medium pr-8" />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">h</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">地点 (Location)</Label>
                <div className="relative">
                   <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-white font-medium" />
                   <MapPin className="absolute right-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-base font-bold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] mt-4"
            >
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 创建中...</> : "确认预约 (Confirm Booking)"}
            </Button>

          </form>
        </div>
      </main>
    </div>
  );
}