-- ============================================
-- SUBCATEGORIES FEATURE MIGRATION
-- ============================================
-- This migration adds support for custom subcategories
-- Users can create subcategories like "Samosa", "Momo" under parent categories like "Food & Groceries"

-- Create subcategories table
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, parent_category_id, name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subcategories_user_id ON public.subcategories(user_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_parent_category ON public.subcategories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_favorite ON public.subcategories(user_id, is_favorite) WHERE is_favorite = TRUE;

-- Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subcategories
DROP POLICY IF EXISTS "Users can view their own subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Users can create their own subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Users can update their own subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Users can delete their own subcategories" ON public.subcategories;

CREATE POLICY "Users can view their own subcategories"
ON public.subcategories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subcategories"
ON public.subcategories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subcategories"
ON public.subcategories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subcategories"
ON public.subcategories FOR DELETE
USING (auth.uid() = user_id);

-- Add subcategory_id column to incomes table
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Add subcategory_id column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Add indexes for subcategory_id columns
CREATE INDEX IF NOT EXISTS idx_incomes_subcategory_id ON public.incomes(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_expenses_subcategory_id ON public.expenses(subcategory_id);

-- Add comments for documentation
COMMENT ON TABLE public.subcategories IS 'Custom subcategories created by users under predefined or custom parent categories';
COMMENT ON COLUMN public.subcategories.parent_category_id IS 'Reference to the parent category (e.g., Food & Groceries, Entertainment, Rent)';
COMMENT ON COLUMN public.subcategories.name IS 'Name of the subcategory (e.g., Samosa, Momo, Netflix)';
COMMENT ON COLUMN public.subcategories.is_favorite IS 'Indicates if this subcategory is marked as favorite for quick access';
COMMENT ON COLUMN public.incomes.subcategory_id IS 'Optional reference to a specific subcategory under the main category';
COMMENT ON COLUMN public.expenses.subcategory_id IS 'Optional reference to a specific subcategory under the main category';

-- Grant permissions
GRANT ALL ON public.subcategories TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Run this script in Supabase SQL Editor
-- Then refresh your application
