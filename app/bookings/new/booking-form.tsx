"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createBooking } from "../actions";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2, MapPin, User, Link as LinkIcon } from "lucide-react";

// 定义学员类型
type Student = {
  id: string;
  name: string;
  level: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 w-full rounded-xl bg-indigo-600 text-base font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98]"
    >
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "确认预约 (Confirm)"}
    </Button>
  );
}

export function BookingForm({ students }: { students: Student[] }) {
  const { currentBusinessId } = useBusiness();
  const [duration, setDuration] = useState("1");
  const [state, formAction] = useActionState(createBooking, null);

  return (
    <form action={formAction} className="space-y-7">
      {/* 隐藏字段：传递 Business ID 和 Duration */}
      <input type="hidden" name="businessId" value={currentBusinessId} />
      <input type="hidden" name="duration" value={duration} />

      {/* 1. 学员选择 */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          学员 (Student)
        </Label>
        <Select name="studentId" required>
          <SelectTrigger className="h-14 rounded-xl border-slate-200/70 bg-slate-50/50 px-4 text-base font-medium text-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <SelectValue placeholder="选择学员..." />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 shadow-lg">
            {students.length === 0 ? (
              <SelectItem value="none" disabled>暂无学员，请先添加</SelectItem>
            ) : (
              students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} <span className="text-slate-400">({s.level})</span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 2. 日期与时间 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            开始时间 (Start)
          </Label>
          <div className="relative">
            <Input
              name="startTime"
              type="datetime-local"
              required
              className="h-14 rounded-xl border-slate-200/70 bg-slate-50/50 px-4 text-sm font-semibold text-slate-700"
            />
            <Calendar className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 时长选择 */}
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            时长 (Duration)
          </Label>
          <div className="flex h-14 w-full rounded-xl border border-slate-200/70 bg-slate-50/50 p-1">
            {["1", "1.5", "2"].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setDuration(val)}
                className={`flex-1 rounded-lg text-sm font-semibold transition-all ${
                  duration === val
                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {val}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 地点与链接 (双列布局) */}
      <div className="space-y-4">
        {/* 物理地点 */}
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            接送地点 (Location)
          </Label>
          <div className="relative">
            <Input
              name="location"
              placeholder="默认地点..."
              className="h-12 rounded-xl border-slate-200/70 bg-slate-50/50 pl-11 text-sm font-medium text-slate-700"
            />
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
              <MapPin className="h-5 w-5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* ✅ Zoom / 会议链接 */}
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            会议链接 (Zoom / Google Meet)
          </Label>
          <div className="relative">
            <Input
              name="meetingUrl"
              placeholder="https://zoom.us/j/..."
              className="h-12 rounded-xl border-slate-200/70 bg-slate-50/50 pl-11 text-sm font-medium text-slate-700 text-blue-600 underline-offset-2 placeholder:no-underline"
            />
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
              <LinkIcon className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. 备注 */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          课程备注 (Notes)
        </Label>
        <Textarea
          name="notes"
          placeholder="例如：重点练习侧方停车..."
          className="resize-none rounded-xl border-slate-200/70 bg-slate-50/50 text-sm font-medium text-slate-700"
          rows={3}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}