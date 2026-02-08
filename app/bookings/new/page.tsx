"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "../actions";
import { useBusiness } from "@/contexts/BusinessContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, ArrowLeft, Repeat } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { zhCN } from "date-fns/locale";

export default function NewBookingPage() {
  const { currentBusinessId } = useBusiness();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  
  // 表单状态
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("1");
  const [studentId, setStudentId] = useState("");
  const [location, setLocation] = useState("线上");
  const [repeatCount, setRepeatCount] = useState("1"); // 循环次数

  useEffect(() => {
    async function fetchStudents() {
      const supabase = createClient();
      const { data } = await supabase
        .from("students")
        .select("id, name")
        .eq("business_unit_id", currentBusinessId);
      if (data) setStudents(data);
    }
    if (currentBusinessId) fetchStudents();
  }, [currentBusinessId]);

  const handleSubmit = async () => {
    if (!date || !studentId || !time) return alert("请填写完整信息");
    setLoading(true);

    // 组合日期和时间
    const [hours, minutes] = time.split(':');
    const startDateTime = new Date(date);
    startDateTime.setHours(parseInt(hours), parseInt(minutes));

    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("startTime", startDateTime.toString()); 
    formData.append("duration", duration);
    formData.append("location", location);
    formData.append("businessId", currentBusinessId);
    formData.append("repeatCount", repeatCount);

    // ✅ 修复点：这里传入 null 作为第一个参数 (prevState)
    const res = await createBooking(null, formData);
    
    setLoading(false);

    //createBooking 返回可能是 undefined (如果void) 或者对象
    //为了安全，我们加个判断
    if (res && 'error' in res && res.error) {
        alert("创建失败: " + res.error);
    } else {
        router.push("/bookings");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <Card className="w-full max-w-lg p-6 space-y-8 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900">新建预约</h1>
        </div>

        <div className="space-y-5">
          {/* 1. 选择学员 */}
          <div className="space-y-2">
            <Label>学员 (Student)</Label>
            <Select onValueChange={setStudentId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="选择学员..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. 日期与时间 (美化版) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>日期 (Date)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-11",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: zhCN }) : <span>选个日子</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>时间 (Time)</Label>
              <Input 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* 3. 时长与循环 (Cycle) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>时长 (Duration)</Label>
              <div className="flex items-center gap-2">
                {[1, 1.5, 2].map((h) => (
                  <Button
                    key={h}
                    variant={Number(duration) === h ? "default" : "outline"}
                    className="flex-1 h-11"
                    onClick={() => setDuration(h.toString())}
                  >
                    {h}h
                  </Button>
                ))}
              </div>
            </div>

            {/* 循环排课 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-indigo-600">
                <Repeat className="h-3.5 w-3.5" /> 
                周期 (每周一次)
              </Label>
              <Select value={repeatCount} onValueChange={setRepeatCount}>
                <SelectTrigger className="h-11 border-indigo-200 bg-indigo-50/30 focus:ring-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">单次课程 (Only once)</SelectItem>
                  <SelectItem value="5">循环 5 周 (5 Weeks)</SelectItem>
                  <SelectItem value="10">循环 10 周 (10 Weeks)</SelectItem>
                  <SelectItem value="12">循环 1 学期 (12 Weeks)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>地点 (Location)</Label>
            <Input 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="例如：线上 / 图书馆 / 上门"
              className="h-11"
            />
          </div>

          <Button 
            className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md mt-4" 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : 
             Number(repeatCount) > 1 
               ? `批量创建 ${repeatCount} 节课程` 
               : "确认预约 (Confirm)"
            }
          </Button>
        </div>
      </Card>
    </main>
  );
}