import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BusinessProvider } from "@/contexts/BusinessContext"; 
// ✅ 新增：引入 Toaster 组件 (假设你用 shadcn 命令安装的)
// 如果你是 npm install sonner 直接安装的，这里改成 import { Toaster } from "sonner";
import { Toaster } from "@/components/ui/sonner"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tangent ERP",
  description: "Internal management system for Tangent Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BusinessProvider>
          {children}
          {/* ✅ 必须加这一行！否则弹窗不会显示 */}
          <Toaster />
        </BusinessProvider>
      </body>
    </html>
  );
}