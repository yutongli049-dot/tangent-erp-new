"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, getRememberMe, setRememberMe } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [remember, setRemember] = useState(() => getRememberMe());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    setRememberMe(remember);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setPending(false);
      setError("账号或密码错误，请重试。");
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <main className="flex h-dvh w-full max-w-full flex-col items-center justify-center overflow-x-hidden overscroll-none bg-slate-50 p-6">
      <div className="w-full min-w-0 max-w-sm space-y-8">
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

        <div className="w-full min-w-0 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
            <div className="w-full min-w-0 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@tangent.center"
                required
                autoComplete="email"
                className="h-11 w-full min-w-0 rounded-xl border-slate-200/70 bg-slate-50/50"
              />
            </div>
            <div className="w-full min-w-0 space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-11 w-full min-w-0 rounded-xl border-slate-200/70 bg-slate-50/50"
              />
            </div>

            <label className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              60天免登录（推荐 PWA）
            </label>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="h-12 w-full min-w-0 rounded-xl bg-indigo-600 font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98]"
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
          </form>
        </div>

        <p className="text-center text-xs text-slate-400">
          Authorized Personnel Only
        </p>
      </div>
    </main>
  );
}
