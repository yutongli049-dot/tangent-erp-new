"use client";

// ✅ 修改点 1: 从 'react' 引入 useActionState
import { useActionState } from "react";
// ✅ 修改点 2: useFormStatus 依然保留在 'react-dom' 中
import { useFormStatus } from "react-dom";
import { login } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

// 提交按钮组件（带 Loading 状态）
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-indigo-600 font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  );
}

// 初始状态
const initialState = {
  error: "",
};

export default function LoginPage() {
  // ✅ 修改点 3: 使用 useActionState 替代 useFormState
  // 注意：useActionState 的返回值结构是 [state, action, isPending]，我们只需要前两个
  const [state, formAction] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Logo / Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tangent ERP
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Internal Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm">
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@tangent.center"
                required
                className="h-11 rounded-xl border-slate-200/70 bg-slate-50/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 rounded-xl border-slate-200/70 bg-slate-50/50"
              />
            </div>

            {/* Error Message */}
            {state?.error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>
        </div>
        
        <p className="text-center text-xs text-slate-400">
          Authorized Personnel Only
        </p>
      </div>
    </main>
  );
}