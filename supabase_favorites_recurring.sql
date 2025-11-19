-- ============================================
-- ADD FAVORITES AND RECURRING TO INCOMES & EXPENSES
-- Run this in Supabase SQL Editor
-- ============================================

-- Add columns to incomes table
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Add columns to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_incomes_favorite ON public.incomes(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_incomes_recurring ON public.incomes(user_id, is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_favorite ON public.expenses(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON public.expenses(user_id, is_recurring) WHERE is_recurring = TRUE;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Now you can:
-- 1. Mark entries as favorites (starred)
-- 2. Mark entries as recurring
-- 3. Filter by favorites or recurring entries
