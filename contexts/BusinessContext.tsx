"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { BUSINESS_UNITS, BusinessId, DEFAULT_BUSINESS_ID } from "@/lib/constants";

interface BusinessContextType {
  currentBusinessId: BusinessId;
  switchBusiness: (id: BusinessId) => void;
  currentLabel: string;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [currentBusinessId, setCurrentBusinessId] = useState<BusinessId>(DEFAULT_BUSINESS_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. 初始化时从 LocalStorage 读取上次的选择
  useEffect(() => {
    const saved = localStorage.getItem("tangent_active_business");
    if (saved && BUSINESS_UNITS.find((b) => b.id === saved)) {
      setCurrentBusinessId(saved as BusinessId);
    }
    setIsLoaded(true);
  }, []);

  // 2. 切换业务逻辑
  const switchBusiness = (id: BusinessId) => {
    setCurrentBusinessId(id);
    localStorage.setItem("tangent_active_business", id);
    // 这里未来可以加一行代码：强制刷新页面数据
    // router.refresh(); 
  };

  // 获取当前业务的显示名称
  const currentLabel = BUSINESS_UNITS.find((b) => b.id === currentBusinessId)?.label || "Select Business";

  // 避免服务端渲染不一致（Hydration Mismatch），稍微等待一下客户端加载
  if (!isLoaded) {
    return null; // 或者返回一个全屏 Loading 骨架屏
  }

  return (
    <BusinessContext.Provider value={{ currentBusinessId, switchBusiness, currentLabel }}>
      {children}
    </BusinessContext.Provider>
  );
}

// 自定义 Hook，方便组件调用
export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}