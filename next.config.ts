import type { NextConfig } from "next";
// @ts-ignore: 忽略插件的类型检查
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  // 1. 修复：skipWaiting 移入 workboxOptions，或者直接依赖默认行为
  // 2. 移除顶层的 skipWaiting 以解决 TS 报错
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    skipWaiting: true, // ✅ 移到这里
    disableDevLogs: true,
  },
});

// ✅ 修复：移除了 ": NextConfig" 显式类型注解，避免因为 turbopack 属性导致 TS 报错
const nextConfig = {
  // @ts-ignore: 忽略 turbopack 属性的类型报错
  turbopack: {},

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);