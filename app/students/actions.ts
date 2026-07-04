"use server";



import { createClient } from "@/lib/supabase/server";

import { revalidatePath } from "next/cache";

import { incrementStudentBalance } from "@/lib/student-balance";

import { roundHours } from "@/lib/utils";







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

  const paymentType = (formData.get("paymentType") as string) || "monthly";



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

    payment_type: paymentType,

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





// 2. 更新学员 (Update) — 支持管理员 targetBalance 强行校正

export async function updateStudent(id: string, data: {

  name?: string;

  studentCode?: string;

  subject?: string;

  teacher?: string;

  level?: string;

  hourlyRate?: number;

  targetBalance?: number;

  paymentType?: string;

}) {

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "用户未登录" };



  const { data: current, error: fetchError } = await supabase

    .from("students")

    .select("balance, name, student_code, business_unit_id")

    .eq("id", id)

    .single();



  if (fetchError || !current) return { error: "找不到学员" };



  const currentBalance = Number(current.balance);



  if (data.targetBalance !== undefined && data.targetBalance !== null) {

    const targetBalance = roundHours(Number(data.targetBalance));

    const diff = roundHours(targetBalance - currentBalance);



    if (diff !== 0) {

      const balanceRes = await incrementStudentBalance(supabase, id, diff);

      if (balanceRes.error) return { error: balanceRes.error };



      await supabase.from("transactions").insert({

        type: "adjustment",

        amount: 0,

        category: "Tuition",

        description: `[系统调账] 管理员手动校正总课时：由 ${currentBalance} 修正为 ${targetBalance}，差额 ${diff} 课时`,

        transaction_date: new Date().toISOString(),

        business_unit_id: current.business_unit_id,

        created_by: user.id,

        student_id: id,

        quantity: diff,

      });

    }

  }



  const { error } = await supabase

    .from("students")

    .update({

      name: data.name,

      student_code: data.studentCode,

      subject: data.subject,

      teacher: data.teacher,

      level: data.level,

      hourly_rate: data.hourlyRate,

      ...(data.paymentType !== undefined ? { payment_type: data.paymentType } : {}),

    })

    .eq("id", id);



  if (error) return { error: error.message };



  revalidatePath("/students");

  revalidatePath(`/students/${id}`);

  revalidatePath("/finance");

  revalidatePath("/");

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



  const balanceRes = await incrementStudentBalance(supabase, studentId, hoursToAdd);

  if (balanceRes.error) return { error: balanceRes.error };



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



// 5. 退课退款 (Refund)

export async function refundStudent(studentId: string, hoursToSubtract: number) {

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "用户未登录" };



  if (!hoursToSubtract || hoursToSubtract <= 0) {

    return { error: "退课课时必须大于 0" };

  }



  const { data: student, error: fetchError } = await supabase

    .from("students")

    .select("name, student_code, balance, hourly_rate, business_unit_id")

    .eq("id", studentId)

    .single();



  if (fetchError || !student) return { error: "找不到学员" };



  if (Number(student.balance) < hoursToSubtract) {

    return { error: `余额不足，当前剩余 ${student.balance} 课时` };

  }



  const balanceRes = await incrementStudentBalance(supabase, studentId, -hoursToSubtract);

  if (balanceRes.error) return { error: balanceRes.error };



  const hourlyRate = student.hourly_rate || 70;

  const refundAmount = hoursToSubtract * hourlyRate;



  await supabase.from("transactions").insert({

    type: "expense",

    amount: refundAmount,

    category: "Tuition",

    description: `[退课退款] 扣除学员 ${student.name} ${hoursToSubtract} 课时`,

    transaction_date: new Date().toISOString(),

    business_unit_id: student.business_unit_id,

    created_by: user.id,

    student_id: studentId,

    quantity: hoursToSubtract,

  });



  revalidatePath(`/students/${studentId}`);

  revalidatePath("/students");

  revalidatePath("/finance");

  revalidatePath("/");

  return { success: true };

}



// 6. 获取单个学员的完整历史 (消费 & 充值)

export async function getStudentHistory(studentId: string) {

  const supabase = await createClient();



  const { data: bookings } = await supabase

    .from("bookings")

    .select("*")

    .eq("student_id", studentId)

    .order("start_time", { ascending: false });



  const { data: transactions } = await supabase

    .from("transactions")

    .select("*")

    .eq("student_id", studentId)

    .order("transaction_date", { ascending: false });



  return { bookings, transactions };

}

