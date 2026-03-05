-- Subscriptions table for Toss Payments billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',          -- 'free', '30', '50', '100', 'unlimited'
  status TEXT NOT NULL DEFAULT 'active',      -- 'active', 'cancelled', 'expired', 'past_due'
  billing_key TEXT,                            -- 토스 billingKey
  customer_key TEXT,                           -- 토스 customerKey
  card_last4 TEXT,                             -- 카드 뒷4자리
  card_company TEXT,                           -- 카드사
  amount INTEGER NOT NULL DEFAULT 0,           -- 결제 금액 (원)
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  uploads_used INTEGER DEFAULT 0,              -- 이번 달 업로드 수
  uploads_limit INTEGER,                       -- 업로드 한도 (NULL = 무제한)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Lawyers can read their own subscription
CREATE POLICY "Lawyers can view own subscription" ON subscriptions
  FOR SELECT USING (
    lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid())
  );

-- Index
CREATE INDEX idx_subscriptions_lawyer ON subscriptions(lawyer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
