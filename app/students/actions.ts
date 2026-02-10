"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";



// 1. 创建学员 (Create)
export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "用户未登录" };
  
  const name = formData.get("name") as string;
  const studentCode = formData.get("studentId") as string; 
  const subject = formData.get("subject") as string;
  const teacher = formData.get("teacher") as string;
  const businessId = formData.get("businessId") as string;
  const level = (formData.get("level") as string) || "Year 11"; 
  const hourlyRate = Number(formData.get("hourlyRate")) || 70;
  const initialBalance = Number(formData.get("balance")) || 0;

  if (!name || !businessId) return { error: "姓名必填" };

  // 插入学员
  const { data: newStudent, error: studentError } = await supabase.from("students").insert({
    name,
    student_code: studentCode, 
    subject,
    teacher,
    level, 
    hourly_rate: hourlyRate,
    balance: initialBalance,
    business_unit_id: businessId,
  }).select().single();

  if (studentError) return { error: studentError.message };

  // 自动同步流水
  if (initialBalance > 0) {
    const amount = initialBalance * hourlyRate;
    await supabase.from("transactions").insert({
      type: "income",
      amount: amount,
      category: "Tuition",
      description: `初始充值: [${studentCode || '无学号'}] ${name} (+${initialBalance}课时)`,
      transaction_date: new Date().toISOString(),
      business_unit_id: businessId,
      created_by: user.id,
      student_id: newStudent?.id,
      quantity: initialBalance,
    });
  }

  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}

// 2. ✅ 新增：更新学员 (Update)
export async function updateStudent(id: string, data: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("students")
    .update({
      name: data.name,
      student_code: data.studentCode,
      subject: data.subject,
      teacher: data.teacher,
      level: data.level,
      hourly_rate: data.hourlyRate,
      // balance 通常不建议直接编辑，建议走充值/扣费，但为了灵活性这里允许改
      // 如果你想严格控制，可以注释掉下面这行
      // balance: data.balance 
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return { success: true };
}

// 3. 删除学员 (Delete)
export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) return { error: error.message };
  revalidatePath("/students");
  return { success: true };
}

// 4. 学员充值 (Top Up)
export async function topUpStudent(studentId: string, hoursToAdd: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "用户未登录" };

  const { data: student, error: fetchError } = await supabase
    .from("students")
    .select("name, student_code, balance, hourly_rate, business_unit_id")
    .eq("id", studentId)
    .single();

  if (fetchError || !student) return { error: "找不到学员" };

  const newBalance = Number(student.balance) + hoursToAdd;
  const { error: updateError } = await supabase
    .from("students")
    .update({ balance: newBalance })
    .eq("id", studentId);

  if (updateError) return { error: updateError.message };

  if (hoursToAdd > 0) {
    const incomeAmount = hoursToAdd * (student.hourly_rate || 70);
    const desc = `学员充值: [${student.student_code || '无学号'}] ${student.name} (+${hoursToAdd}课时)`;
    
    await supabase.from("transactions").insert({
      type: "income",
      amount: incomeAmount,
      category: "Tuition",
      description: desc,
      transaction_date: new Date().toISOString(),
      business_unit_id: student.business_unit_id,
      created_by: user.id,
      student_id: studentId,
      quantity: hoursToAdd,
    });
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}

// ✅ 新增：获取单个学员的完整历史 (消费 & 充值)
export async function getStudentHistory(studentId: string) {
  const supabase = await createClient();

  // 1. 查课程记录 (消费)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("student_id", studentId)
    .order("start_time", { ascending: false }); // 最近的课在前面

  // 2. 查流水记录 (充值 & 其他)
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("student_id", studentId)
    .order("transaction_date", { ascending: false });

  return { bookings, transactions };
}