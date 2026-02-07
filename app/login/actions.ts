"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ✅ 修复点：添加 prevState 参数 (即使不用也要占位)
// ✅ 修复点：明确 formData 的类型
export async function login(prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 这里返回的对象必须匹配 page.tsx 里的 initialState 类型
    return { error: "账号或密码错误，请重试。" }; 
  }

  revalidatePath("/", "layout");
  redirect("/");
}