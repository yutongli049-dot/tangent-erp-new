import type { NextConfig } from "next";
// @ts-ignore: 忽略类型检查，确保 build 通过
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // 缓存策略配置，解决 Vercel 构建超时问题
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development", // 开发环境禁用
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // 显式声明不使用 Turbopack 的自定义配置（为了兼容 PWA 插件的 Webpack 注入）
  // 虽然 Next 16 默认开启，但这能压制部分警告
  experimental: {
    // turbo: { ... } // 如果未来需要 turbo 配置写在这里
  },
};

export default withPWA(nextConfig);