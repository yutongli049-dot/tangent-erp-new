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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, MapPin, Car, DollarSign, Repeat, CalendarCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DualTimezonePreview } from "@/components/DualTimezoneTime";
import { CreatableCombobox } from "@/components/CreatableCombobox";
import { getTodayInNZ } from "@/lib/timezone";
import {
  fetchFormSuggestions,
  mergeLocationOptions,
  partitionStudentsByActivity,
  type StudentWithMeta,
} from "@/lib/form-suggestions";
import {
  REPEAT_MODE_OPTIONS,
  isRecurringMode,
  usesSingleTimePicker,
  usesWeeklyScheduleBuilder,
} from "@/lib/recurrence";

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

// ✅ 提取复用：高度复杂的 Zoom 级循环构建器
function RecurrenceSelector({ 
  repeatMode, setRepeatMode, 
  endMode, setEndMode, 
  repeatCount, setRepeatCount, 
  endDate, setEndDate,
  time, setTime,
  weeklySchedule, setWeeklySchedule,
  customIntervalWeeks, setCustomIntervalWeeks,
}: {
  repeatMode: string;
  setRepeatMode: (v: string) => void;
  endMode: string;
  setEndMode: (v: string) => void;
  repeatCount: string;
  setRepeatCount: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  weeklySchedule: { dayOfWeek: string; time: string }[];
  setWeeklySchedule: (v: { dayOfWeek: string; time: string }[]) => void;
  customIntervalWeeks: string;
  setCustomIntervalWeeks: (v: string) => void;
}) {
  const recurring = isRecurringMode(repeatMode);
  const showSingleTime = usesSingleTimePicker(repeatMode);
  const showWeeklyBuilder = usesWeeklyScheduleBuilder(repeatMode);

  return (
    <div className="col-span-2 space-y-3 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50 transition-all">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-indigo-700 font-bold uppercase pl-1 flex items-center gap-1"><Repeat className="h-3 w-3"/> 排课模式</Label>
          <Select value={repeatMode} onValueChange={setRepeatMode}>
            <SelectTrigger className={`h-12 rounded-xl bg-white ${recurring ? 'border-indigo-400 font-bold text-indigo-700 shadow-sm' : 'border-slate-200'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPEAT_MODE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {showSingleTime && (
          <div className="space-y-2 animate-in fade-in zoom-in-95">
            <Label className="text-xs text-slate-500 font-bold pl-1">上课时间 (NZT)</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-12 rounded-xl bg-white" />
          </div>
        )}
      </div>

      {repeatMode === "custom" && (
        <div className="space-y-2 animate-in fade-in">
          <Label className="text-xs text-slate-500 font-bold pl-1">自定义间隔 (周)</Label>
          <div className="relative max-w-[200px]">
            <Input type="number" min="1" max="52" value={customIntervalWeeks} onChange={e => setCustomIntervalWeeks(e.target.value)} className="h-10 rounded-xl bg-white pr-8" />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">周</span>
          </div>
        </div>
      )}

      {showWeeklyBuilder && (
        <div className="space-y-4 pt-3 mt-2 border-t border-indigo-100 animate-in fade-in slide-in-from-top-2">
           <div>
             <Label className="text-xs font-bold text-indigo-700 mb-2 block">每周上课时间 (Weekly Schedule)</Label>
             <div className="space-y-2">
               {weeklySchedule.map((session, index) => (
                  <div key={index} className="flex items-center gap-2">
                     <Select value={session.dayOfWeek} onValueChange={(val) => {
                         const newSchedule = [...weeklySchedule];
                         newSchedule[index].dayOfWeek = val;
                         setWeeklySchedule(newSchedule);
                     }}>
                        <SelectTrigger className="h-10 bg-white border-slate-200 shadow-sm"><SelectValue/></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="1">周一 (Mon)</SelectItem><SelectItem value="2">周二 (Tue)</SelectItem>
                           <SelectItem value="3">周三 (Wed)</SelectItem><SelectItem value="4">周四 (Thu)</SelectItem>
                           <SelectItem value="5">周五 (Fri)</SelectItem><SelectItem value="6">周六 (Sat)</SelectItem>
                           <SelectItem value="0">周日 (Sun)</SelectItem>
                        </SelectContent>
                     </Select>
                     <Input type="time" value={session.time} onChange={(e) => {
                         const newSchedule = [...weeklySchedule];
                         newSchedule[index].time = e.target.value;
                         setWeeklySchedule(newSchedule);
                     }} className="h-10 bg-white border-slate-200 shadow-sm" />
                     {weeklySchedule.length > 1 && (
                         <Button variant="ghost" size="icon" type="button" onClick={() => setWeeklySchedule(weeklySchedule.filter((_, i) => i !== index))} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 h-10 w-10 shrink-0">
                           <Trash2 className="h-4 w-4"/>
                         </Button>
                     )}
                  </div>
               ))}
               <Button type="button" variant="outline" size="sm" className="w-full h-10 border-dashed border-indigo-300 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 mt-2" onClick={() => setWeeklySchedule([...weeklySchedule, { dayOfWeek: "1", time: "16:00" }])}>
                 + 增加一天上课时间 (Add Time)
               </Button>
             </div>
           </div>
        </div>
      )}

      {recurring && (
           <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-indigo-100 animate-in fade-in">
             <div className="space-y-2">
               <Label className="text-xs text-slate-500 font-bold pl-1">结束条件</Label>
               <Select value={endMode} onValueChange={setEndMode}>
                 <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="count">{repeatMode === "monthly" ? "按月数结束" : "按周数结束"}</SelectItem>
                   <SelectItem value="date">按日期结束</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             {endMode === 'count' ? (
               <div className="space-y-2">
                 <Label className="text-xs text-slate-500 font-bold pl-1">
                   {repeatMode === "monthly" ? "重复总月数" : "重复总周数"}
                 </Label>
                 <div className="relative">
                   <Input type="number" min="2" max="52" value={repeatCount} onChange={e => setRepeatCount(e.target.value)} className="h-10 rounded-xl bg-white pr-8" />
                   <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">{repeatMode === "monthly" ? "月" : "周"}</span>
                 </div>
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
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  
  const [identifier, setIdentifier] = useState(""); 
  const [date, setDate] = useState(() => getTodayInNZ());
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("1");
  const [location, setLocation] = useState("");
  const [subject, setSubject] = useState("限制性 (Restricted)"); 
  const [notes, setNotes] = useState("");
  
  const [repeatMode, setRepeatMode] = useState("none");
  const [endMode, setEndMode] = useState("count");
  const [repeatCount, setRepeatCount] = useState("10");
  const [endDate, setEndDate] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState([{ dayOfWeek: "1", time: "10:00" }]);
  const [customIntervalWeeks, setCustomIntervalWeeks] = useState("1");
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>(VTNZ_LOCATIONS);

  const [useInstructorCar, setUseInstructorCar] = useState(true);
  const [actualRate, setActualRate] = useState("85"); 
  const [needPickup, setNeedPickup] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [plateNumber, setPlateNumber] = useState("");

  useEffect(() => { setActualRate(useInstructorCar ? "85" : "75"); }, [useInstructorCar]);

  useEffect(() => {
    async function loadSuggestions() {
      const { subjects, locations } = await fetchFormSuggestions(supabase, businessId);
      setSubjectOptions([
        "道路熟悉 (Familiarization)",
        "限制性 (Restricted)",
        "全驾照 (Full)",
        ...subjects,
      ]);
      setLocationOptions(mergeLocationOptions(locations, VTNZ_LOCATIONS));
    }
    loadSuggestions();
  }, [businessId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !date || !location || !subject) { toast.warning("请补全必填信息"); return; }
    if (usesSingleTimePicker(repeatMode) && !time) { toast.warning("请填写时间"); return; }
    if (isRecurringMode(repeatMode) && endMode === 'date' && !endDate) { toast.warning("请选择结束日期"); return; }

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
    formData.append("customIntervalWeeks", customIntervalWeeks);
    formData.append("weeklySchedule", JSON.stringify(weeklySchedule));

    if (notes) formData.append("notes", notes);
    if (pickupAddress) formData.append("pickupAddress", pickupAddress);
    if (plateNumber) formData.append("plateNumber", plateNumber);

    const result = await quickCreateDrivingBooking(formData);
    setIsLoading(false);

    if (result && result.error) toast.error(result.error);
    else {
      toast.success(isRecurringMode(repeatMode) ? "批量排课成功！" : "排课成功！");
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
              <CreatableCombobox
                value={subject}
                onChange={setSubject}
                options={subjectOptions}
                placeholder="选择或输入课程阶段"
              />
           </div>
           <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase pl-1">考点 / 练车地点 *</Label>
              <CreatableCombobox
                value={location}
                onChange={setLocation}
                options={locationOptions}
                placeholder="选择或输入地点"
              />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">首节日期 (Start Date)</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">单节时长 (Hours)</Label><div className="relative"><Input type="number" step="0.5" min="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-12 rounded-xl pr-8" /><span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">h</span></div></div>
           </div>
           
           {/* Zoom Selector */}
           <RecurrenceSelector repeatMode={repeatMode} setRepeatMode={setRepeatMode} endMode={endMode} setEndMode={setEndMode} repeatCount={repeatCount} setRepeatCount={setRepeatCount} endDate={endDate} setEndDate={setEndDate} time={time} setTime={setTime} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} customIntervalWeeks={customIntervalWeeks} setCustomIntervalWeeks={setCustomIntervalWeeks} />
           {usesSingleTimePicker(repeatMode) && date && time && (
             <DualTimezonePreview date={date} time={time} />
           )}
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
          {isLoading ? <><Loader2 className="mr-2 animate-spin" /> 提交中...</> : (isRecurringMode(repeatMode) ? "批量排课" : "一键排课")}
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
  const [students, setStudents] = useState<StudentWithMeta[]>([]);
  const [activeStudents, setActiveStudents] = useState<StudentWithMeta[]>([]);
  const [inactiveStudents, setInactiveStudents] = useState<StudentWithMeta[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>(["2 Bently Ave", "线上"]);
  
  const [selectedStudent, setSelectedStudent] = useState("");
  const [date, setDate] = useState(() => getTodayInNZ());
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState("1");
  const [location, setLocation] = useState("线上");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("Henry");
  const [notes, setNotes] = useState("");
  
  const [repeatMode, setRepeatMode] = useState("none");
  const [endMode, setEndMode] = useState("count");
  const [repeatCount, setRepeatCount] = useState("10");
  const [endDate, setEndDate] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState([{ dayOfWeek: "1", time: "16:00" }]);
  const [customIntervalWeeks, setCustomIntervalWeeks] = useState("1");

  useEffect(() => {
    async function fetchData() {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const [studentsRes, bookingsRes, suggestions] = await Promise.all([
        supabase
          .from("students")
          .select("id, name, student_code, subject")
          .eq("business_unit_id", businessId)
          .order("student_code", { ascending: true }),
        supabase
          .from("bookings")
          .select("student_id")
          .eq("business_unit_id", businessId)
          .gte("start_time", oneMonthAgo.toISOString())
          .neq("status", "cancelled"),
        fetchFormSuggestions(supabase, businessId),
      ]);

      const list = (studentsRes.data ?? []) as StudentWithMeta[];
      setStudents(list);

      const activeIds = new Set(
        (bookingsRes.data ?? []).map((b) => b.student_id).filter(Boolean)
      );
      const { active, inactive } = partitionStudentsByActivity(list, activeIds);
      setActiveStudents(active);
      setInactiveStudents(inactive);

      setSubjectOptions(suggestions.subjects);
      setTeacherOptions(suggestions.teachers);
      setLocationOptions(mergeLocationOptions(suggestions.locations));
    }
    fetchData();
  }, [businessId, supabase]);

  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId);
    const s = students.find(st => st.id === studentId);
    if (s?.subject) {
      setSubject(s.subject);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !date || !location) { toast.warning("请补全信息"); return; }
    if (usesSingleTimePicker(repeatMode) && !time) { toast.warning("请填写时间"); return; }
    if (isRecurringMode(repeatMode) && endMode === 'date' && !endDate) { toast.warning("请选择结束日期"); return; }

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
    formData.append("customIntervalWeeks", customIntervalWeeks);
    formData.append("weeklySchedule", JSON.stringify(weeklySchedule));

    if (notes) formData.append("notes", notes); 

    const result = await createBooking(null, formData);
    setIsLoading(false);

    if (result && result.error) toast.error(result.error);
    else { 
       toast.success(isRecurringMode(repeatMode) ? "批量排课成功！" : "课程预约已创建"); 
       router.push("/bookings"); 
    }
  };

  const renderStudentItem = (s: StudentWithMeta) => (
    <SelectItem key={s.id} value={s.id} className="py-3 font-medium">
      <span className="font-mono text-slate-400 mr-2">{s.student_code ? `[${s.student_code}]` : ''}</span>{s.name}
    </SelectItem>
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 font-bold uppercase pl-1">学员 (Student)</Label>
          <Select value={selectedStudent} onValueChange={handleStudentChange}>
            <SelectTrigger className="h-12 rounded-xl bg-white font-medium text-slate-900 w-full"><SelectValue placeholder="选择学员..." /></SelectTrigger>
            <SelectContent className="max-h-72">
              {activeStudents.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-indigo-600 font-bold text-xs px-2 py-2">
                    活跃学员 · 近一月有课
                  </SelectLabel>
                  {activeStudents.map(renderStudentItem)}
                </SelectGroup>
              )}
              {activeStudents.length > 0 && inactiveStudents.length > 0 && (
                <div className="my-1 border-t border-slate-100" />
              )}
              {inactiveStudents.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-slate-400 font-bold text-xs px-2 py-2">
                    沉寂学员 · 超一月未排课
                  </SelectLabel>
                  {inactiveStudents.map(renderStudentItem)}
                </SelectGroup>
              )}
              {students.length === 0 && (
                <SelectItem value="_empty" disabled>暂无学员，请先添加</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
            <Label className="text-xs text-slate-400 font-bold uppercase pl-1">科目 (Subject)</Label>
            <CreatableCombobox
              value={subject}
              onChange={setSubject}
              options={subjectOptions}
              placeholder="选择或输入科目"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-400 font-bold uppercase pl-1">老师 (Teacher)</Label>
            <CreatableCombobox
              value={teacher}
              onChange={setTeacher}
              options={teacherOptions}
              placeholder="选择或输入老师"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">首节日期 (Start Date)</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl" /></div>
          <div className="space-y-2"><Label className="text-xs text-slate-400 font-bold uppercase pl-1">单节时长 (Hours)</Label><div className="relative"><Input type="number" step="0.5" min="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-12 rounded-xl pr-8" /><span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">h</span></div></div>
        </div>
        
        <RecurrenceSelector repeatMode={repeatMode} setRepeatMode={setRepeatMode} endMode={endMode} setEndMode={setEndMode} repeatCount={repeatCount} setRepeatCount={setRepeatCount} endDate={endDate} setEndDate={setEndDate} time={time} setTime={setTime} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} customIntervalWeeks={customIntervalWeeks} setCustomIntervalWeeks={setCustomIntervalWeeks} />
        {usesSingleTimePicker(repeatMode) && date && time && (
          <DualTimezonePreview date={date} time={time} />
        )}

        <div className="space-y-2">
            <Label className="text-xs text-slate-400 font-bold uppercase pl-1">地点 (Location)</Label>
            <div className="relative">
              <CreatableCombobox
                value={location}
                onChange={setLocation}
                options={locationOptions}
                placeholder="选择或输入地点"
              />
              <MapPin className="absolute right-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 font-bold uppercase pl-1">备注 (Notes)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl border-slate-200 bg-white" placeholder="选填..." />
        </div>

        <Button type="submit" disabled={isLoading} className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-base font-bold shadow-lg shadow-indigo-200 mt-4 transition-all active:scale-95">
          {isLoading ? <><Loader2 className="mr-2 h-5 animate-spin" /> 创建中...</> : (isRecurringMode(repeatMode) ? "批量生成" : "确认预约")}
        </Button>
      </form>
    </div>
  );
}