-- 多币种支持：transactions / students 增加 currency 列
-- 在 Supabase SQL Editor 执行后，再执行下方 NOTIFY 刷新 PostgREST schema cache

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NZD';

-- 可选约束（若已有脏数据可先跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_currency_check'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_currency_check
      CHECK (currency IN ('NZD', 'RMB'));
  END IF;
END $$;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NZD';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_currency_check'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_currency_check
      CHECK (currency IN ('NZD', 'RMB'));
  END IF;
END $$;

-- 刷新 PostgREST schema cache（否则仍可能报 Could not find the 'currency' column）
NOTIFY pgrst, 'reload schema';
