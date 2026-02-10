import type { Metadata, Viewport } from "next"; // ✅ 引入 Viewport
import { Inter } from "next/font/google";
import "./globals.css";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

// ✅ 1. 配置 PWA 相关的元数据
export const metadata: Metadata = {
  title: "Tangent ERP",
  description: "All-in-one Business Management",
  manifest: "/manifest.json", // 关联 manifest
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tangent ERP",
  },
  formatDetection: {
    telephone: false,
  },
};

// ✅ 2. 配置视口和主题色 (Next.js 14+ 推荐写法)
export const viewport: Viewport = {
  themeColor: "#4f46e5", // 你的品牌紫 (Indigo-600)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 禁止缩放，像原生 App 一样
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50`}>
        <BusinessProvider>
          {children}
          <Toaster position="top-center" />
        </BusinessProvider>
      </body>
    </html>
  );
}