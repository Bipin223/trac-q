n-- ============================================
-- LEND & BORROW TABLE SETUP
-- Run this script in Supabase SQL Editor
-- ============================================

-- Create lend_borrow table
CREATE TABLE IF NOT EXISTS lend_borrow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('lend', 'borrow')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  contact_name VARCHAR(100) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'repaid', 'partial')),
  repaid_amount DECIMAL(12, 2) DEFAULT 0 CHECK (repaid_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_lend_borrow_user_id ON lend_borrow(user_id);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_type ON lend_borrow(type);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_status ON lend_borrow(status);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_transaction_date ON lend_borrow(transaction_date);

-- Enable Row Level Security
ALTER TABLE lend_borrow ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own lend/borrow entries" ON lend_borrow;
DROP POLICY IF EXISTS "Users can insert their own lend/borrow entries" ON lend_borrow;
DROP POLICY IF NOT EXISTS "Users can update their own lend/borrow entries" ON lend_borrow;
DROP POLICY IF EXISTS "Users can delete their own lend/borrow entries" ON lend_borrow;

-- Create RLS policies
CREATE POLICY "Users can view their own lend/borrow entries"
  ON lend_borrow
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lend/borrow entries"
  ON lend_borrow
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lend/borrow entries"
  ON lend_borrow
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lend/borrow entries"
  ON lend_borrow
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lend_borrow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS lend_borrow_updated_at_trigger ON lend_borrow;
CREATE TRIGGER lend_borrow_updated_at_trigger
  BEFORE UPDATE ON lend_borrow
  FOR EACH ROW
  EXECUTE FUNCTION update_lend_borrow_updated_at();

-- ============================================
-- SETUP COMPLETE!
-- ============================================

-- Test query (optional)
-- SELECT * FROM lend_borrow WHERE user_id = auth.uid();
