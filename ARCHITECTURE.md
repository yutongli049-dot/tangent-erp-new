# Tangent ERP — Architecture Reference

> 面向 AI 辅助开发的快速上下文同步文档。最后更新：2026-07-03

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | **Next.js 16** App Router |
| 语言 | **TypeScript 5** |
| UI | **React 19**、**Tailwind CSS 4**、**shadcn/ui**（Radix UI） |
| 后端 / DB | **Supabase**（Auth + Postgres） |
| 数据变更 | **Server Actions**（`"use server"`） |
| 时间 | **date-fns** + **date-fns-tz**（`lib/timezone.ts`） |
| 图表 | **recharts** |
| 日历订阅 | **ical-generator**（`/api/calendar/[businessId]`） |
| 通知 | **sonner** |
| PWA | **@ducanh2912/next-pwa** |

## 业务单元（多租户）

| ID | 名称 | 场景 |
|----|------|------|
| `cus` | CuS Academy | K12 教培：课时制、科目/老师 |
| `sine` | Sine Studio | 驾校：极速排课、按次定价 |
| `tangent` | Tangent Group | 集团汇总视图 |

切换逻辑：`contexts/BusinessContext.tsx`（Cookie + 整页刷新）

---

## 项目目录树（核心部分）

```
tangent-erp-new/
├── app/                              # App Router 路由域
│   ├── layout.tsx                    # 根布局 + BusinessProvider
│   ├── page.tsx                      # Dashboard 首页
│   ├── middleware.ts                 # (根目录) 认证拦截
│   │
│   ├── bookings/                     # ★ 排课模块
│   │   ├── page.tsx                  # 排课列表页（Server Component 拉数据）
│   │   ├── booking-list.tsx          # 客户端列表 + 编辑/完课/取消
│   │   ├── actions.ts                # ★ 排课 CRUD + 循环生成（UTC 存储）
│   │   └── new/
│   │       └── page.tsx              # ★ 教培/驾校新建排课表单
│   │
│   ├── students/                     # ★ 学员模块
│   │   ├── page.tsx
│   │   ├── student-list.tsx          # 学员列表 + 充值弹窗
│   │   ├── actions.ts                # 学员 CRUD + 充值
│   │   ├── new/page.tsx              # ★ 录入新学员（教培）
│   │   └── [id]/                     # 学员详情 / 充值 / 编辑
│   │
│   ├── finance/                      # 财务模块
│   │   ├── page.tsx                  # 财务驾驶舱
│   │   ├── actions.ts                # 流水 CRUD + 统计
│   │   ├── add/page.tsx              # 记一笔
│   │   └── transactions/
│   │
│   ├── login/ | register/            # 认证
│   ├── dashboard-actions.ts          # 首页统计 Server Actions
│   │
│   └── api/
│       └── calendar/[businessId]/
│           └── route.ts              # ★ ICS 日历订阅（Service Role）
│
├── components/
│   ├── ui/                           # shadcn 原子组件
│   ├── CreatableCombobox.tsx         # ★ 可创建下拉（科目/老师/地点）
│   ├── DualTimezoneTime.tsx          # 中新双时区展示
│   ├── Navbar.tsx
│   ├── BusinessSwitcher.tsx
│   └── InvoiceModal.tsx
│
├── contexts/
│   └── BusinessContext.tsx           # 当前 business_unit_id
│
├── lib/
│   ├── timezone.ts                   # ★ NZ/UTC/CN 时区工具（存储屏障）
│   ├── recurrence.ts                 # ★ 排课循环模式枚举与判断
│   ├── form-suggestions.ts           # ★ 表单下拉去重数据源
│   ├── utils.ts                      # cn(), durationToMs(), roundHours()
│   ├── constants.ts                  # BUSINESS_UNITS 枚举
│   └── supabase/
│       ├── client.ts                 # 浏览器端 Supabase
│       ├── server.ts                 # Server Component / Action 端
│       └── middleware.ts             # Session 刷新
│
└── middleware.ts                     # 路由保护（排除 /api, /login）
```

---

## 核心数据实体

```
business_units (逻辑枚举，constants.ts)
    │
    ├── students          balance, hourly_rate, subject, teacher, student_code
    ├── bookings          start_time (UTC), end_time, duration, status, location, subject, teacher, notes
    └── transactions      income/expense, category, amount

profiles ← Supabase Auth
```

### 排课循环模式 (`repeatMode`)

| value | 含义 | UI |
|-------|------|-----|
| `none` | 单次 | 单一时间选择 |
| `weekly_once` | 每周单次 | 单一时间 + 结束条件 |
| `weekly_multi` | 每周多次 | 周时间表构建器 |
| `biweekly` | 每两周 | 单一时间 + 结束条件 |
| `monthly` | 每月 | 单一时间 + 按月结束 |
| `custom` | 自定义间隔（周） | 周时间表 + 间隔周数 |

> 兼容旧值 `weekly` → 自动映射为 `weekly_multi`

---

## 数据流向

### 1. 排课创建（教培 / 驾校）

```
bookings/new/page.tsx (Client)
  │  表单：学员、科目、老师、地点、NZ 本地 date+time、repeatMode
  │  下拉选项：fetchFormSuggestions() 从 students + bookings 去重
  ▼
createBooking / quickCreateDrivingBooking (Server Action)
  │  buildBookingSessions() → nzLocalToUtc() 解析 NZ 时间
  │  输出 start_time / end_time 为 UTC ISO 字符串
  ▼
Supabase bookings.insert([...])
  │
  ▼
revalidatePath("/bookings")
```

**时区规范（必须遵守）：**

- 前端传入：`date`（YYYY-MM-DD）+ `time`（HH:mm），语义为 **Pacific/Auckland**
- 存储：一律 `toISOString()` UTC
- 禁止：`new Date(\`${date}T${time}\`)` 直接存库

### 2. 排课展示

```
bookings.start_time (UTC ISO)
  ▼
DualTimezoneTime / formatDualTime()
  → 主显 NZT，副显 BJT，例：16:00 (NZT) / 12:00 (BJT)
```

日期分组、今天/明天判断均走 `lib/timezone.ts`（NZ 日历日）。

### 3. 学员建档 + 充值

```
students/new/page.tsx → createStudent (Server Action)
  │  CreatableCombobox：subject / teacher 来自历史去重
  ▼
students.insert + transactions.insert（若有初始 balance）

student-list.tsx → topUpStudent
  ▼
students.balance += hours（0.5h 步进，roundHours 防浮点）
```

### 4. 完课扣课时

```
completeBooking(id, studentId, duration)
  ▼
bookings.status = "completed"
students.balance -= duration（roundHours）
```

取消/删除已完成课程会回滚 balance。

### 5. ICS 日历订阅

```
GET /api/calendar/[businessId]
  │  Service Role Key（绕过 RLS，middleware 不拦截 /api）
  │  start/end = new Date(utcIso) 传给 ical-generator
  │  location = "{地点} | {NZT} / {BJT}"
  ▼
text/calendar 响应
```

---

## Supabase 读写规范

| 场景 | 客户端 | 说明 |
|------|--------|------|
| 浏览器表单拉选项 | `lib/supabase/client.ts` | 只读：students、bookings 去重 |
| Server Actions 写操作 | `lib/supabase/server.ts` | 需登录；CRUD + revalidatePath |
| ICS 日历 | Service Role（route handler） | 无用户 session，按 businessId 过滤 |
| Middleware | `lib/supabase/middleware.ts` | 刷新 session；未登录 → /login |

**注意：**

- 多租户过滤：部分页面仍在客户端按 `businessId` filter，服务端查询有待加强
- 余额更新为 read-modify-write，无 DB 事务
- 仓库内无 migration 文件，schema 需对照 Supabase 控制台

---

## 关键工具库

### `lib/timezone.ts`

| 函数 | 用途 |
|------|------|
| `nzLocalToUtc(date, time)` | **存储屏障**：NZ 本地 → UTC Date |
| `utcToNzDateStr / utcToNzTimeStr` | 编辑表单回填 |
| `addCalendarDaysInNZ / addCalendarMonthsInNZ` | 循环排课日期运算 |
| `formatDualTime(utcIso)` | `16:00 (NZT) / 12:00 (BJT)` |
| `getTodayInNZ()` | 表单默认日期 |

### `lib/recurrence.ts`

循环模式常量、`isRecurringMode()`、`usesWeeklyScheduleBuilder()`、`getWeekStep()`

### `lib/form-suggestions.ts`

`fetchFormSuggestions()` — 从 `students` + `bookings` 提取去重 subject/teacher/location  
`partitionStudentsByActivity()` — 活跃/沉寂学员分组（近一月排课）

### `lib/utils.ts`

`durationToMs(hours)` — 支持 0.5h 步进  
`roundHours(hours)` — 余额加减防浮点

### `components/CreatableCombobox.tsx`

支持下拉选择 + 自由键入；用于科目、老师、地点字段。

---

## 表单交互要点（近期升级）

1. **Creatable Combobox**：教培排课、学员录入的 Subject/Teacher/Location；地点默认含 `2 Bently Ave`、`线上`
2. **学员分组下拉**：活跃（近一月有课）↑ 前排，沉寂 ↓ 后排，组内按学号排序
3. **排课模式**：6 种 repeatMode，Server Action `buildBookingSessions` 统一处理

---

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # 仅 ICS 日历 route 使用
```

---

## 已知技术债（开发时注意）

- `app/bookings/new/booking-form.tsx` 为废弃代码，实际表单在 `new/page.tsx`
- 移动端 Dock / TabItem 在多个 page 重复
- Dashboard `realizedRevenue` 部分硬编码 `$70/h`
- 排课无冲突检测；循环提交无幂等
- `/api/calendar` URL 泄露可读取排课（Service Role）
