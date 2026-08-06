-- payments 테이블을 "모든 결제(단건 + 구독)의 영수증 저장소"로 확장
-- Supabase SQL Editor에서 실행하세요. (기존 payments 테이블 전제 — 010_payments.sql)

ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url text;                      -- 토스 매출전표(영수증) URL
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'credit';     -- 'credit'(단건) | 'subscription'(구독 최초) | 'subscription_recurring'(정기 자동청구)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_name text;                     -- 구매자/변호사 이름

-- 구독 결제도 기록하므로 크레딧 전용 컬럼은 null 허용이어야 함(기존 정의상 이미 null 허용)
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);
