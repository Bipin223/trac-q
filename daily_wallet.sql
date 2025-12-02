-- ============================================
-- DAILY WALLET SYSTEM MIGRATION
-- ============================================
-- This migration adds support for daily budget tracking and expenses

-- Create daily_budgets table
CREATE TABLE IF NOT EXISTS public.daily_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_limit NUMERIC(12, 2) NOT NULL CHECK (daily_limit > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_expenses table
CREATE TABLE IF NOT EXISTS public.daily_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  expense_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_budget_history table to track budget for each day
CREATE TABLE IF NOT EXISTS public.daily_budget_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_date DATE NOT NULL,
  daily_limit NUMERIC(12, 2) NOT NULL CHECK (daily_limit > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, budget_date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_budgets_user_id ON public.daily_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_user_id ON public.daily_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date ON public.daily_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_user_date ON public.daily_expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_daily_budget_history_user_id ON public.daily_budget_history(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_budget_history_user_date ON public.daily_budget_history(user_id, budget_date);

-- Add last_reset_date column to existing tables (for migration of existing databases)
-- This is safe to run multiple times due to IF NOT EXISTS
ALTER TABLE public.daily_budgets 
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE;

-- Add index for last_reset_date (after column is created)
CREATE INDEX IF NOT EXISTS idx_daily_budgets_last_reset_date ON public.daily_budgets(last_reset_date);

-- Enable RLS
ALTER TABLE public.daily_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_budget_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_budgets
DROP POLICY IF EXISTS "Users can view their own daily budget" ON public.daily_budgets;
DROP POLICY IF EXISTS "Users can create their own daily budget" ON public.daily_budgets;
DROP POLICY IF EXISTS "Users can update their own daily budget" ON public.daily_budgets;
DROP POLICY IF EXISTS "Users can delete their own daily budget" ON public.daily_budgets;

CREATE POLICY "Users can view their own daily budget"
ON public.daily_budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily budget"
ON public.daily_budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily budget"
ON public.daily_budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily budget"
ON public.daily_budgets FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for daily_expenses
DROP POLICY IF EXISTS "Users can view their own daily expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Users can create their own daily expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Users can update their own daily expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Users can delete their own daily expenses" ON public.daily_expenses;

CREATE POLICY "Users can view their own daily expenses"
ON public.daily_expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily expenses"
ON public.daily_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily expenses"
ON public.daily_expenses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily expenses"
ON public.daily_expenses FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for daily_budget_history
DROP POLICY IF EXISTS "Users can view their own budget history" ON public.daily_budget_history;
DROP POLICY IF EXISTS "Users can create their own budget history" ON public.daily_budget_history;
DROP POLICY IF EXISTS "Users can update their own budget history" ON public.daily_budget_history;
DROP POLICY IF EXISTS "Users can delete their own budget history" ON public.daily_budget_history;

CREATE POLICY "Users can view their own budget history"
ON public.daily_budget_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget history"
ON public.daily_budget_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget history"
ON public.daily_budget_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget history"
ON public.daily_budget_history FOR DELETE
USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.daily_budgets IS 'Stores user daily spending limits for daily wallet tracking';
COMMENT ON TABLE public.daily_expenses IS 'Tracks daily expenses for the daily wallet system';
COMMENT ON TABLE public.daily_budget_history IS 'Stores historical budget amounts for each day to enable accurate history tracking';
COMMENT ON COLUMN public.daily_budgets.daily_limit IS 'Maximum amount user wants to spend per day';
COMMENT ON COLUMN public.daily_budgets.last_reset_date IS 'Tracks the last date when the user confirmed or set their daily budget. Used to trigger daily reset dialog.';
COMMENT ON COLUMN public.daily_expenses.expense_date IS 'Date and time when the expense occurred';
COMMENT ON COLUMN public.daily_expenses.category IS 'Category of the expense (Food, Transport, etc.)';
COMMENT ON COLUMN public.daily_budget_history.budget_date IS 'The specific date this budget amount was set for';
COMMENT ON COLUMN public.daily_budget_history.daily_limit IS 'The budget amount that was active on this date';

-- Update existing records to set last_reset_date (run this after adding the column)
-- This ensures existing budgets don't immediately trigger the reset dialog
UPDATE public.daily_budgets 
SET last_reset_date = CURRENT_DATE::timestamp with time zone
WHERE last_reset_date IS NULL;

-- Grant permissions
GRANT ALL ON public.daily_budgets TO authenticated;
GRANT ALL ON public.daily_expenses TO authenticated;
GRANT ALL ON public.daily_budget_history TO authenticated;

-- ============================================
-- DAILY WALLET MIGRATION COMPLETE
-- ============================================
-- Run this script in Supabase SQL Editor
-- Then access the Daily Wallet page in your application
