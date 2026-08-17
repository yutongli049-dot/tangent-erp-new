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

const nextConfig = {
  // @ts-ignore: 忽略 turbopack 属性的类型报错
  turbopack: {},
} satisfies NextConfig;

export default withPWA(nextConfig);