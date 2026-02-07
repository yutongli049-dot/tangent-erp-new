"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface TransactionData {
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  description: string;
  businessId: string;
  proofUrl?: string;
}

// 1. 创建交易 (保持不变，但 createTransaction 目前还没用上 quantity，暂时不用改)
export async function createTransaction(data: TransactionData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("transactions").insert({
    amount: data.amount,
    type: data.type,
    category: data.category,
    transaction_date: data.date,
    description: data.description,
    business_unit_id: data.businessId,
    proof_img_url: data.proofUrl,
    created_by: user.id,
  });

  if (error) {
    console.error("Supabase Error:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/finance/transactions");
  return { success: true };
}

// 2. ✅ 智能删除交易 (Smart Delete)
export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  
  // A. 删除前先查询：这笔交易到底是什么？
  const { data: tx } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (!tx) return { error: "Transaction not found" };

  // B. 智能判断：如果是“关联了学员”的“充值(income)”记录，且有“数量(quantity)”
  // 那么这就是一笔充值，我们需要回滚余额！
  if (tx.student_id && tx.type === 'income' && tx.quantity && tx.quantity > 0) {
    
    // 查出学员当前余额
    const { data: student } = await supabase
      .from("students")
      .select("balance")
      .eq("id", tx.student_id)
      .single();

    if (student) {
      // 执行回滚：当前余额 - 充值的数量
      const newBalance = student.balance - tx.quantity;
      
      console.log(`正在回滚学员 ${tx.student_id} 余额: ${student.balance} -> ${newBalance}`);

      const { error: rollbackError } = await supabase
        .from("students")
        .update({ balance: newBalance })
        .eq("id", tx.student_id);

      if (rollbackError) {
        return { error: "余额回滚失败，交易未删除: " + rollbackError.message };
      }
    }
  }

  // C. 只有余额回滚成功后（或者不需要回滚），才真正删除流水
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/finance/transactions");
  // 如果是在学员详情页删的，也要刷新那里，这里简单粗暴刷新所有相关路径
  revalidatePath("/students"); 
  
  return { success: true };
}