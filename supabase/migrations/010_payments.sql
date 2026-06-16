-- 일회성(단건) 콘텐츠 크레딧 결제 기록
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid REFERENCES lawyers(id),
  pack_id text,
  order_id text UNIQUE NOT NULL,
  payment_key text UNIQUE,
  amount integer NOT NULL,
  credits integer,                 -- 구매한 콘텐츠 건수
  order_name text,
  customer_email text,
  status text DEFAULT 'DONE',      -- 'DONE' | 'CANCELED' 등
  fulfilled boolean DEFAULT false, -- 수동 처리(크레딧 반영) 여부
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_lawyer ON payments(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_fulfilled ON payments(fulfilled);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- 서버(서비스롤)에서만 기록/조회하므로 RLS 활성화 + 공개 정책 없음
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
