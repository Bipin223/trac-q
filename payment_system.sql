-- ============================================
-- PAYMENT SYSTEM - SAFE MIGRATION
-- ============================================
-- Run this in Supabase SQL Editor
-- Safe to run multiple times - handles existing data
-- ============================================

-- STEP 1: Drop existing accounts table if it has issues (CAREFUL!)
-- Only uncomment this if you want to start fresh
-- DROP TABLE IF EXISTS public.accounts CASCADE;

-- STEP 2: Create accounts table with all columns
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  balance NUMERIC(12, 2) DEFAULT 0 NOT NULL CHECK (balance >= 0),
  currency VARCHAR(10) DEFAULT 'NPR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'accounts_user_id_fkey' 
    AND table_name = 'accounts'
  ) THEN
    ALTER TABLE public.accounts 
      ADD CONSTRAINT accounts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint on user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'accounts_user_id_key' 
    AND table_name = 'accounts'
  ) THEN
    ALTER TABLE public.accounts 
      ADD CONSTRAINT accounts_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add currency column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='accounts' AND column_name='currency'
  ) THEN
    ALTER TABLE public.accounts 
      ADD COLUMN currency VARCHAR(10) DEFAULT 'NPR';
  END IF;
END $$;

-- STEP 3: Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(12, 2) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('money_request', 'lend', 'borrow', 'deposit', 'withdrawal', 'transfer')),
  reference_id UUID,
  reference_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add foreign key constraints for transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_user_id_fkey' 
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE public.transactions 
      ADD CONSTRAINT transactions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_account_id_fkey' 
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE public.transactions 
      ADD CONSTRAINT transactions_account_id_fkey 
      FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- STEP 4: Add payment tracking fields to money_requests
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='money_requests' AND column_name='payment_transaction_id'
  ) THEN
    ALTER TABLE public.money_requests 
      ADD COLUMN payment_transaction_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='money_requests' AND column_name='paid_at'
  ) THEN
    ALTER TABLE public.money_requests 
      ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add foreign key for payment_transaction_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'money_requests_payment_transaction_id_fkey' 
    AND table_name = 'money_requests'
  ) THEN
    ALTER TABLE public.money_requests 
      ADD CONSTRAINT money_requests_payment_transaction_id_fkey 
      FOREIGN KEY (payment_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- STEP 5: Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- STEP 6: RLS Policies for accounts
DROP POLICY IF EXISTS "Users can view their own account" ON public.accounts;
CREATE POLICY "Users can view their own account"
ON public.accounts FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own account" ON public.accounts;
CREATE POLICY "Users can update their own account"
ON public.accounts FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own account" ON public.accounts;
CREATE POLICY "Users can insert their own account"
ON public.accounts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- STEP 7: RLS Policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- STEP 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- STEP 9: Create account creation function
CREATE OR REPLACE FUNCTION create_user_account()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.accounts (user_id, balance, currency)
  VALUES (NEW.id, 0, 'NPR')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If insert fails, just continue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 10: Create trigger
DROP TRIGGER IF EXISTS on_profile_created_create_account ON public.profiles;
CREATE TRIGGER on_profile_created_create_account
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_account();

-- STEP 11: Create accounts for existing users
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles LOOP
    INSERT INTO public.accounts (user_id, balance, currency)
    VALUES (profile_record.id, 0, 'NPR')
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    -- Continue even if some inserts fail
    NULL;
END $$;

-- STEP 12: Payment processing function
CREATE OR REPLACE FUNCTION process_money_request_payment(
  p_money_request_id UUID,
  p_payer_id UUID,
  p_receiver_id UUID,
  p_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_payer_account_id UUID;
  v_receiver_account_id UUID;
  v_payer_balance NUMERIC;
  v_receiver_balance NUMERIC;
  v_payer_transaction_id UUID;
  v_receiver_transaction_id UUID;
  v_lend_borrow_id UUID;
BEGIN
  -- Get account IDs and check balances
  SELECT id, balance INTO v_payer_account_id, v_payer_balance
  FROM public.accounts
  WHERE user_id = p_payer_id
  FOR UPDATE;

  SELECT id, balance INTO v_receiver_account_id, v_receiver_balance
  FROM public.accounts
  WHERE user_id = p_receiver_id
  FOR UPDATE;

  -- Check if accounts exist
  IF v_payer_account_id IS NULL THEN
    RAISE EXCEPTION 'Payer account not found';
  END IF;

  IF v_receiver_account_id IS NULL THEN
    RAISE EXCEPTION 'Receiver account not found';
  END IF;

  -- Check if payer has sufficient balance
  IF v_payer_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct from payer
  UPDATE public.accounts
  SET balance = balance - p_amount, updated_at = now()
  WHERE id = v_payer_account_id;

  -- Add to receiver
  UPDATE public.accounts
  SET balance = balance + p_amount, updated_at = now()
  WHERE id = v_receiver_account_id;

  -- Create debit transaction for payer
  INSERT INTO public.transactions (
    user_id, account_id, transaction_type, amount, balance_after,
    description, category, reference_id, reference_type
  ) VALUES (
    p_payer_id, v_payer_account_id, 'debit', p_amount, v_payer_balance - p_amount,
    'Payment for money request', 'money_request', p_money_request_id, 'money_request'
  ) RETURNING id INTO v_payer_transaction_id;

  -- Create credit transaction for receiver
  INSERT INTO public.transactions (
    user_id, account_id, transaction_type, amount, balance_after,
    description, category, reference_id, reference_type
  ) VALUES (
    p_receiver_id, v_receiver_account_id, 'credit', p_amount, v_receiver_balance + p_amount,
    'Received payment for money request', 'money_request', p_money_request_id, 'money_request'
  ) RETURNING id INTO v_receiver_transaction_id;

  -- Update money request status
  UPDATE public.money_requests
  SET 
    status = 'completed',
    payment_transaction_id = v_payer_transaction_id,
    paid_at = now(),
    completed_at = now(),
    updated_at = now()
  WHERE id = p_money_request_id;

  -- Create lend/borrow record for payer (they lent money)
  INSERT INTO public.lend_borrow (
    user_id, type, amount, description, contact_name,
    transaction_date, status, repaid_amount, money_request_id
  )
  SELECT 
    p_payer_id,
    'lend',
    p_amount,
    'Money request payment: ' || COALESCE(mr.description, 'Payment'),
    COALESCE(p.first_name || ' ' || p.last_name, p.email),
    now(),
    'pending',
    0,
    p_money_request_id
  FROM public.money_requests mr
  LEFT JOIN public.profiles p ON p.id = p_receiver_id
  WHERE mr.id = p_money_request_id
  RETURNING id INTO v_lend_borrow_id;

  -- Create lend/borrow record for receiver (they borrowed money)
  INSERT INTO public.lend_borrow (
    user_id, type, amount, description, contact_name,
    transaction_date, status, repaid_amount, money_request_id
  )
  SELECT 
    p_receiver_id,
    'borrow',
    p_amount,
    'Money request received: ' || COALESCE(mr.description, 'Payment'),
    COALESCE(p.first_name || ' ' || p.last_name, p.email),
    now(),
    'pending',
    0,
    p_money_request_id
  FROM public.money_requests mr
  LEFT JOIN public.profiles p ON p.id = p_payer_id
  WHERE mr.id = p_money_request_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'payer_transaction_id', v_payer_transaction_id,
    'receiver_transaction_id', v_receiver_transaction_id,
    'lend_borrow_id', v_lend_borrow_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_money_request_payment(UUID, UUID, UUID, NUMERIC) TO authenticated;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
