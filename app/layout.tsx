import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BusinessProvider } from "@/contexts/BusinessContext"; // ✅ 引入

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
        {/* ✅ 包裹 BusinessProvider */}
        <BusinessProvider>
          {children}
        </BusinessProvider>
      </body>
    </html>
  );
}