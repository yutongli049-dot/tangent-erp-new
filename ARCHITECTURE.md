# Tangent ERP — Architecture Reference

> 面向 AI 辅助开发的快速上下文同步文档。最后更新：2026-08-11

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
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # Dashboard（双币种净现金流）
│   ├── bookings/
│   │   ├── booking-list.tsx          # 编辑/取消 + 批量范围弹窗
│   │   ├── actions.ts                # CRUD + 循环生成 + following 批量
│   │   └── new/
│   ├── students/
│   │   ├── student-list.tsx          # 欠费 / 已预排降权 + 充值币种
│   │   └── actions.ts
│   ├── finance/
│   │   ├── page.tsx                  # 双币种统计看板
│   │   ├── actions.ts
│   │   └── add/page.tsx              # 记一笔（币种选择）
│   └── dashboard-actions.ts
├── lib/
│   ├── timezone.ts                   # NZ/UTC 存储屏障（日历日纯算术）
│   ├── currency.ts                   # NZD / RMB 独立轨道
│   ├── student-payment.ts            # 欠费判定 balance < 0
│   └── recurrence.ts
└── ...
```

---

## 核心数据实体

```
business_units
    ├── students          balance, hourly_rate, payment_type, ...
    ├── bookings          start_time (UTC), duration, status, location, ...
    └── transactions      income/expense/adjustment, amount, currency ('NZD'|'RMB')
```

### 多币种（`transactions.currency`）

| value | 符号 | 说明 |
|-------|------|------|
| `NZD` | `$` | 默认；新西兰元轨道 |
| `RMB` | `¥` | 人民币轨道 |

**规范：**

- NZD 与 RMB **独立汇总**，**不做自动汇率折算**
- Finance / Dashboard 同时展示两套收入、支出、净现金流
- 充值 / 记一笔表单可选币种；课时余额本身与币种无关，币种只决定流水进入哪条轨道
- 旧数据无 `currency` 时按 `NZD` 处理（`normalizeCurrency`）

**Supabase 迁移（若列尚不存在）：**

```sql
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NZD'
  CHECK (currency IN ('NZD', 'RMB'));
```

定义见 `lib/currency.ts`：`aggregateByCurrency`、`formatMoney`、`CURRENCY_OPTIONS`。

### 学员缴费类型 (`payment_type`)

| value | 含义 |
|-------|------|
| `single` | 一课一缴 |
| `monthly` | 一月一缴（默认） |
| `ten_sessions` | 十节课一缴 |
| `term` | 一学期一缴 |
| `custom` | 自定义 |

### 欠费 / 待续费判定（2026-08 起）

```
已预排课时 = Σ(confirmed bookings.duration)
剩余总课时 = students.balance

欠费 isPaymentAlert:
  balance < 0  → 显示红色「欠费」
  balance === 0 → 正常，不报警

待办「待缴费」isBookingUnpaid:
  balance < 0 或 累计待消课时 > balance
```

学员列表视觉：

- **剩余总课时**：核心数字，欠费时玫瑰色高亮
- **已预排**：灰色小字（原「待排」彩灯已取消），展示已确认排课总时长；超排时附 Info 提示

---

## 排课与时区

### 时区规范（必须遵守）

- 前端传入：`date`（YYYY-MM-DD）+ `time`（HH:mm），语义为 **Pacific/Auckland**
- 存储：`nzLocalToUtc` → `toISOString()` UTC
- **禁止**：`new Date(\`${date}T${time}\`)` 直接存库
- **日历日加减**：`addCalendarDaysInNZ` / `addCalendarMonthsInNZ` 使用纯公历 UTC 正午算术  
  （旧实现 `toZonedTime` + `formatInTimeZone` 会在 NZ 夏季造成 **整日 +1** 漂移，已修复）

### 循环排课创建

```
createBooking / quickCreateDrivingBooking
  → buildBookingSessions() → nzLocalToUtc()
  → bookings.insert([...])
```

### 批量排课变更（single / following）

取消或修改循环系列中的某一节时，UI 询问范围：

| scope | 含义 |
|-------|------|
| `single` | 仅操作当前这一节 |
| `following` | 本节及后续所有同系列 confirmed 课 |

**同系列判定（无 series_id 时）：**

```
student_id 相同
AND status = 'confirmed'
AND duration 相同
AND location 相同（含双方均为 null）
AND start_time >= 本节 start_time
```

- `cancelBooking(id, scope)`：批量将匹配记录标为 `cancelled`
- `updateBooking(id, data, scope)`：对本节写入新 NZ 本地时间；对其余匹配课施加相同时间偏移（`deltaMs`），并同步 `duration` / `location`

入口：`app/bookings/booking-list.tsx` 范围选择弹窗。

---

## 数据流向摘要

### 财务闭环

| 操作 | 课时 | transactions | 币种 |
|------|------|--------------|------|
| 充值 | +hours | income / Tuition | 表单选择 |
| 退课 | -hours | expense / Tuition | 默认 NZD |
| 消课 | -duration | **不写流水** | — |
| 调账 | RPC 修正 | adjustment, amount=0 | 默认 NZD |
| 记一笔 | 可选关联充值 | income/expense | 表单选择 |

产值仍由 completed bookings × hourly_rate 推算（NZD 费率语义）。

### ICS 日历

`GET /api/calendar/[businessId]` — Service Role，location 附带 NZT/BJT。

---

## 关键工具库

### `lib/timezone.ts`

| 函数 | 用途 |
|------|------|
| `nzLocalToUtc(date, time)` | 存储屏障 |
| `addCalendarDaysInNZ` | 循环日期（纯日历，无双重偏移） |
| `formatDualTime` | `16:00 (NZT) / 12:00 (BJT)` |

### `lib/currency.ts`

| 函数 | 用途 |
|------|------|
| `CURRENCY_OPTIONS` | NZD $ / RMB ¥ |
| `aggregateByCurrency` | 双轨汇总 |
| `formatMoney` | 带符号格式化 |

### `lib/student-payment.ts`

| 函数 | 用途 |
|------|------|
| `isPaymentAlert` | `balance < 0` |
| `isBookingUnpaid` | 待缴费标签 |

---

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 已知技术债

- `app/bookings/new/booking-form.tsx` 废弃，实际表单在 `new/page.tsx`
- Dashboard `realizedRevenue` 部分硬编码 `$70/h`
- 排课无冲突检测；循环提交无幂等；尚无正式 `series_id`
- `/api/calendar` URL 泄露可读取排课（Service Role）
