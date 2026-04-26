"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/contexts/BusinessContext";
import { createBooking, quickCreateDrivingBooking } from "../actions"; 
import { createClient } from "@/lib/supabase/client";

import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, MapPin, Car, DollarSign, Repeat, CalendarCheck } from "lucide-react";
import { toast } from "sonner"; 

const VTNZ_LOCATIONS = [
  "VTNZ Glen Innes (139 Apirana Ave)", "VTNZ Mt Wellington (5 Sylvia Park Rd)", "VTNZ New Lynn (46 Portage Rd)",
  "VTNZ Westgate (6 Pinot Ln)", "VTNZ Albany (5 Saturn Pl)", "VTNZ North Shore (120 Sunnybrae Rd)",
  "VTNZ Silverdale (5 Furnace Pl)", "VTNZ Warkworth (6/14 Glenmore Dr)", "VTNZ Manukau (132 Cavendish Rd)",
  "VTNZ Manukau ABC (33 Lambie Dr)", "VTNZ Pukekohe (14 Subway Rd)", "VTNZ Takanini (14 Spartan Rd)",
  "VTNZ Wiri (103 Roscommon Rd)", "其他 (Other)"
];

export default function NewBookingPage() {
  const router = useRouter();
  const { currentBusinessId } = useBusiness();
  const isDrivingSchool = currentBusinessId.includes('sine');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <div className="hidden md:block"><Navbar /></div>
      <main className="mx-auto max-w-xl px-4 md:px-6 py-6 md:py-8">
        
        <div className="mb-6 flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-slate-200 shadow-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {isDrivingSchool ? '极速排课 (Quick Book)' : '新建课程预约'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">New Session Booking</p>
          </div>
        </div>

        {isDrivingSchool ? (
           <DrivingBookingForm businessId={currentBusinessId} router={router} />
        ) : (
           <TutoringBookingForm businessId={currentBusinessId} router={router} />
        )}

      </main>
    </div>
  );
}

// 提取的复用组件：Zoom 风格循环选择器
function RecurrenceSelector({ repeatMode, setRepeatMode, endMode, setEndMode, repeatCount, setRepeatCount, endDate, setEndDate }: any) {
  return (
    <div className="col-span-2 space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
      <div className="space-y-2">
        <Label className="text-xs text-indigo-600 font-bold uppercase pl-1 flex items-center gap-1"><Repeat className="h-3 w-3"/> 循环排课 (Recurrence)</Label>
        <Select value={repeatMode} onValueChange={setRepeatMode}>
          <SelectTrigger className={`h-12 rounded-xl bg-white ${repeatMode !== "none" ? 'border-indigo-300 font-bold text-indigo-700' : 'border-slate-200'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">不循环 (单次预约)</SelectItem>
            <SelectItem value="weekly">每周重复 (Weekly)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {repeatMode === 'weekly' && (
        <div className="grid grid-cols-2 gap-3 pt-2 animate-in fade-in slide-in-from-top-2">
           <div className="space-y-2">
             <Label className="text-xs text-slate-500 font-bold pl-1">结束条件</Label>
             <Select value={endMode} onValueChange={setEndMode}>
               <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="count">按次数结束</SelectItem>
                 <SelectItem value="date">按日期结束</SelectItem>
               </SelectContent>
             </Select>
           </div>
           
           {endMode === 'count' ? (
             <div className="space-y-2">
               <Label className="text-xs text-slate-500 font-bold pl-1">重复总次数 (含首节)</Label>
               <Input type="number" min="2" max="52" value={repeatCount} onChange={e => setRepeatCount(e.target.value)} className="h-10 rounded-xl bg-white" />
             </div>
           ) : (
             <div className="space-y-2">
               <Label className="text-xs text-slate-500 font-bold pl-1 flex items-center gap-1"><CalendarCheck className="h-3 w-3"/> 截止日期</Label>
               <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 rounded-xl bg-white" />
             </div>
           )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 🚗 驾校专属：极速排课表单
// ==========================================
function DrivingBookingForm({ businessId, router }: { businessId: string, router: any }) {
  const [isLoading, setIsLoading] = useState(false);
  
  const [identifier, setIdentifier] = useState(""); 
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("1");
  const [location, setLocation] = useState("");
  const [subject, setSubject] = useState("限制性 (Restricted)"); 
  const [notes, setNotes] = useState("");
  
  // ✅ Zoom 循环参数
  const [repeatMode, setRepeatMode] = useState("none");
  const [endMode, setEndMode] = useState("count");
  const [repeatCount, setRepeatCount] = useState("10");
  const [endDate, setEndDate] = useState("");

  const [useInstructorCar, setUseInstructorCar] = useState(true);
  const [actualRate, setActualRate] = useState("85"); 
  const [needPickup, setNeedPickup] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [plateNumber, setPlateNumber] = useState("");

  useEffect(() => { setActualRate(useInstructorCar ? "85" : "75"); }, [useInstructorCar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !date || !time || !location || !subject) {
      toast.warning("请补全必填信息"); return;
    }
    if (repeatMode === 'weekly' && endMode === 'date' && !endDate) {
      toast.warning("请选择结束日期"); return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("businessId", businessId);
    formData.append("identifier", identifier);
    formData.append("date", date);
    formData.append("time", time);
    formData.append("duration", duration);
    formData.append("location", location);
    formData.append("actualRate", actualRate);
    formData.append("useInstructorCar", String(useInstructorCar));
    formData.append("needPickup", String(needPickup));
    formData.append("subject", subject);
    
    // 注入循环参数
    formData.append("repeatMode", repeatMode);
    formData.append("endMode", endMode);
    formData.append("repeatCount", repeatCount);
    formData.append("endDate", endDate);

    if (notes) formData.append("notes", notes);
    if (pickupAddress) formData.append("pickupAddress", pickupAddress);
    if (plateNumber) formData.append("plateNumber", plateNumber);

    const result = await quickCreateDrivingBooking(formData);
    setIsLoading(false);

    if (result && result.error) toast.error(result.error);
    else {
      toast.success(repeatMode === "none" ? "排课成功！" : "批量排课成功！");
      router.push("/bookings"); 
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs text-indigo-500 font-bold uppercase tracking-wider pl-1">学员编号或姓名 *</Label>
          <Input placeholder="例如: 8011 或 Alex" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-indigo-50/30 font-bold text-lg" autoFocus />
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
           <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase pl-1">课程阶段 *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-12 rounded-xl bg-white"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="道路熟悉 (Familiarization)">道路熟悉 (Familiarization)</SelectItem>
                  <SelectItem value="限制性 (Restricted)">限制性驾照 (Restricted)</SelectItem>
                  <SelectItem value="全驾照 (Full)">全驾照 (Full)</SelectItem>
                </SelectContent>
              </Select>
           </div>
           <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase pl-1">考点 / 练车地点 *</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="h-12 rounded-xl bg-white"><SelectValue/></SelectTrigger>
                <SelectContent className="max-h-60">{VTNZ_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
              </Select>
           </div>
           <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-1"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">日期</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 col-span-1"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">时间</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 col-span-1"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">时长(h)</Label><Input type="number" step="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-12 rounded-xl" /></div>
           </div>
           
           {/* Zoom Selector */}
           <RecurrenceSelector repeatMode={repeatMode} setRepeatMode={setRepeatMode} endMode={endMode} setEndMode={setEndMode} repeatCount={repeatCount} setRepeatCount={setRepeatCount} endDate={endDate} setEndDate={setEndDate} />
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
           <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Car className="h-4 w-4 text-slate-500" /><Label className="font-bold">使用教练车</Label></div><Switch checked={useInstructorCar} onCheckedChange={setUseInstructorCar} /></div>
           {!useInstructorCar && <Input placeholder="输入学员车牌号 (选填)" value={plateNumber} onChange={(e)=>setPlateNumber(e.target.value)} className="h-10 rounded-xl" />}
           <div className="flex items-center justify-between pt-2"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" /><Label className="font-bold">需要上门接送</Label></div><Switch checked={needPickup} onCheckedChange={setNeedPickup} /></div>
           {needPickup && <Input placeholder="输入详细接送地址" value={pickupAddress} onChange={(e)=>setPickupAddress(e.target.value)} className="h-10 rounded-xl" />}
           <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <Label className="font-bold text-slate-900 flex items-center gap-1"><DollarSign className="h-4 w-4 text-emerald-500" /> 本次课单价 (/hr)</Label>
              <Input type="number" value={actualRate} onChange={(e) => setActualRate(e.target.value)} className="h-10 w-24 rounded-xl text-right font-black text-emerald-600 border-emerald-200 bg-white" />
           </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label className="text-xs text-slate-400 font-bold uppercase pl-1">备注信息 (Notes)</Label>
          <Textarea placeholder="选填..." value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl bg-white min-h-[80px]" />
        </div>

        <Button type="submit" disabled={isLoading} className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-base font-bold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
          {isLoading ? <><Loader2 className="mr-2 animate-spin" /> 提交中...</> : (repeatMode === "none" ? "一键排课" : "批量排课")}
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// 📚 教培专属：标准排课表单
// ==========================================
function TutoringBookingForm({ businessId, router }: { businessId: string, router: any }) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState("1");
  const [location, setLocation] = useState("线上");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("Henry");
  const [notes, setNotes] = useState("");
  
  // ✅ Zoom 循环参数
  const [repeatMode, setRepeatMode] = useState("none");
  const [endMode, setEndMode] = useState("count");
  const [repeatCount, setRepeatCount] = useState("10");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function fetchStudents() {
      const { data } = await supabase.from("students").select("id, name, student_code, subject").eq("business_unit_id", businessId).order("student_code", { ascending: true });
      if (data) setStudents(data);
    }
    fetchStudents();
  }, [businessId]);

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
    if (!selectedStudent || !date || !time) { toast.warning("请补全信息"); return; }
    if (repeatMode === 'weekly' && endMode === 'date' && !endDate) {
      toast.warning("请选择结束日期"); return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("studentId", selectedStudent);
    formData.append("date", date);
    formData.append("time", time);
    formData.append("duration", duration);
    formData.append("location", location);
    formData.append("businessId", businessId);
    formData.append("subject", subject);
    formData.append("teacher", teacher);
    
    // 注入循环参数
    formData.append("repeatMode", repeatMode);
    formData.append("endMode", endMode);
    formData.append("repeatCount", repeatCount);
    formData.append("endDate", endDate);

    if (notes) formData.append("notes", notes); 

    const result = await createBooking(null, formData);
    setIsLoading(false);

    if (result && result.error) toast.error(result.error);
    else { 
       toast.success(repeatMode === "none" ? "课程预约已创建" : "批量排课成功！"); 
       router.push("/bookings"); 
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 font-bold uppercase pl-1">学员 (Student)</Label>
          <Select value={selectedStudent} onValueChange={handleStudentChange}>
            <SelectTrigger className="h-12 rounded-xl bg-white font-medium text-slate-900"><SelectValue placeholder="选择学员..." /></SelectTrigger>
            <SelectContent className="max-h-60">
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id} className="py-3 font-medium">
                  <span className="font-mono text-slate-400 mr-2">{s.student_code ? `[${s.student_code}]` : ''}</span>{s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
            <Label className="text-xs text-slate-400 font-bold uppercase pl-1">科目 (Subject)</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-12 rounded-xl bg-white font-medium"><SelectValue placeholder="选择科目" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Math">Math (数学)</SelectItem>
                <SelectItem value="Physics">Physics (物理)</SelectItem>
                <SelectItem value="Chemistry">Chemistry (化学)</SelectItem>
                <SelectItem value="Other">Other (其他)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-400 font-bold uppercase pl-1">老师 (Teacher)</Label>
            <Select value={teacher} onValueChange={setTeacher}>
              <SelectTrigger className="h-12 rounded-xl bg-white font-medium"><SelectValue placeholder="选择老师" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Henry">Henry</SelectItem>
                <SelectItem value="Yvetta">Yvetta</SelectItem>
                <SelectItem value="Elvis">Elvis</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2 col-span-1"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">首节日期</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl" /></div>
          <div className="space-y-2 col-span-1"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">时间</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-xl" /></div>
          <div className="space-y-2 col-span-1"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">时长</Label><div className="relative"><Input type="number" step="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-12 rounded-xl pr-8" /><span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">h</span></div></div>
        </div>
        
        {/* Zoom Selector */}
        <RecurrenceSelector repeatMode={repeatMode} setRepeatMode={setRepeatMode} endMode={endMode} setEndMode={setEndMode} repeatCount={repeatCount} setRepeatCount={setRepeatCount} endDate={endDate} setEndDate={setEndDate} />

        <div className="space-y-2">
            <Label className="text-xs text-slate-400 font-bold uppercase pl-1">地点 (Location)</Label>
            <div className="relative"><Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-12 rounded-xl" /><MapPin className="absolute right-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" /></div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 font-bold uppercase pl-1">备注 (Notes)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl border-slate-200 bg-white" placeholder="选填..." />
        </div>

        <Button type="submit" disabled={isLoading} className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-base font-bold shadow-lg shadow-indigo-200 mt-4">
          {isLoading ? <><Loader2 className="mr-2 h-5 animate-spin" /> 创建中...</> : (repeatMode === "none" ? "确认预约" : "批量生成")}
        </Button>
      </form>
    </div>
  );
}