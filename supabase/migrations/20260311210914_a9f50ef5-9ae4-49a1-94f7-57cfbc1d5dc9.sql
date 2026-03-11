
-- Add new enum values to transaction_status
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'initiated';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'pending_verification';

-- Add columns to transactions for traceability
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider_reference text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS network text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_type text;

-- Unique index on reference for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_reference_unique ON transactions(reference) WHERE reference IS NOT NULL;

-- Wallet ledger table - every balance change must be recorded
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  transaction_reference text NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount numeric NOT NULL CHECK (amount > 0),
  balance_after numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ledger" ON wallet_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Atomic wallet deduction with row locking
CREATE OR REPLACE FUNCTION lock_and_deduct_wallet(p_user_id uuid, p_amount numeric, p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance numeric;
BEGIN
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', v_wallet.balance);
  END IF;
  v_new_balance := v_wallet.balance - p_amount;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE id = v_wallet.id;
  INSERT INTO wallet_ledger (user_id, wallet_id, transaction_reference, type, amount, balance_after, description)
  VALUES (p_user_id, v_wallet.id, p_reference, 'debit', p_amount, v_new_balance, 'Purchase deduction');
  RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet.id, 'balance_before', v_wallet.balance, 'balance_after', v_new_balance);
END;
$$;

-- Atomic wallet refund with row locking
CREATE OR REPLACE FUNCTION refund_wallet(p_user_id uuid, p_amount numeric, p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance numeric;
BEGIN
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  v_new_balance := v_wallet.balance + p_amount;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE id = v_wallet.id;
  INSERT INTO wallet_ledger (user_id, wallet_id, transaction_reference, type, amount, balance_after, description)
  VALUES (p_user_id, v_wallet.id, p_reference, 'credit', p_amount, v_new_balance, 'Purchase refund');
  RETURN jsonb_build_object('success', true, 'balance_after', v_new_balance);
END;
$$;

-- Atomic wallet funding with row locking and max balance check
CREATE OR REPLACE FUNCTION fund_wallet_atomic(p_user_id uuid, p_amount numeric, p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance numeric;
BEGIN
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  IF v_wallet.balance + p_amount > 8000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum wallet balance of 8000000 exceeded');
  END IF;
  v_new_balance := v_wallet.balance + p_amount;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE id = v_wallet.id;
  INSERT INTO wallet_ledger (user_id, wallet_id, transaction_reference, type, amount, balance_after, description)
  VALUES (p_user_id, v_wallet.id, p_reference, 'credit', p_amount, v_new_balance, 'Wallet funding');
  RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet.id, 'balance_before', v_wallet.balance, 'balance_after', v_new_balance);
END;
$$;
