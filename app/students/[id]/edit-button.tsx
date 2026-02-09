"use client";

import { useState } from "react";
import { updateStudent } from "../actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function EditStudentButton({ student }: { student: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(student);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    const res = await updateStudent(student.id, {
      name: data.name,
      studentCode: data.student_code,
      subject: data.subject,
      level: data.level,
      hourlyRate: data.hourly_rate,
      teacher: data.teacher
    });
    setLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("保存成功");
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 text-slate-500" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑档案</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="space-y-2">
               <Label>姓名</Label>
               <Input value={data.name} onChange={(e) => setData({...data, name: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>学号</Label>
               <Input value={data.student_code || ""} onChange={(e) => setData({...data, student_code: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>科目</Label>
                 <Input value={data.subject || ""} onChange={(e) => setData({...data, subject: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>年级</Label>
                 <Select value={data.level} onValueChange={(val) => setData({...data, level: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Year 9">Year 9</SelectItem>
                      <SelectItem value="Year 10">Year 10</SelectItem>
                      <SelectItem value="Year 11">Year 11</SelectItem>
                      <SelectItem value="Year 12">Year 12</SelectItem>
                      <SelectItem value="Year 13">Year 13</SelectItem>
                      <SelectItem value="University">University</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>费率 ($/h)</Label>
                 <Input type="number" value={data.hourly_rate} onChange={(e) => setData({...data, hourly_rate: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>老师</Label>
                 <Input value={data.teacher || ""} onChange={(e) => setData({...data, teacher: e.target.value})} />
               </div>
             </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}