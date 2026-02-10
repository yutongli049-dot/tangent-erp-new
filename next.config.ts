import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",       // Service Worker 输出目录
  register: true,       // 自动注册 Service Worker
  skipWaiting: true,    // 更新时跳过等待
  disable: process.env.NODE_ENV === "development", // 开发环境禁用 PWA，方便调试
});

const nextConfig: NextConfig = {
  /* config options here */
  // 这里可以放你其他的 Next.js 配置，比如 reactStrictMode: true 等
};

export default withPWA(nextConfig);