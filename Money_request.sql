-- ============================================
-- MONEY REQUEST SYSTEM - Run this in Supabase SQL Editor
-- ============================================
-- Adds money request, lend/borrow, and split bill features for friends
-- ============================================

-- STEP 1: Create money_requests table
CREATE TABLE IF NOT EXISTS public.money_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) DEFAULT 'NPR',
  description TEXT,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('request_money', 'send_money', 'split_bill')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- STEP 2: Update lend_borrow table to link with friends
ALTER TABLE public.lend_borrow 
  ADD COLUMN IF NOT EXISTS friend_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS money_request_id UUID REFERENCES public.money_requests(id) ON DELETE SET NULL;

-- STEP 3: Create split_bills table
CREATE TABLE IF NOT EXISTS public.split_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  currency VARCHAR(10) DEFAULT 'NPR',
  split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- STEP 4: Create split_bill_participants table
CREATE TABLE IF NOT EXISTS public.split_bill_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_bill_id UUID REFERENCES public.split_bills(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  share_amount NUMERIC(12, 2) NOT NULL CHECK (share_amount >= 0),
  paid_amount NUMERIC(12, 2) DEFAULT 0 CHECK (paid_amount >= 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'settled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(split_bill_id, user_id)
);

-- STEP 5: Enable RLS on all tables
ALTER TABLE public.money_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bill_participants ENABLE ROW LEVEL SECURITY;

-- STEP 6: RLS Policies for money_requests
DROP POLICY IF EXISTS "Users can view money requests involving them" ON public.money_requests;
CREATE POLICY "Users can view money requests involving them"
ON public.money_requests FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create money requests" ON public.money_requests;
CREATE POLICY "Users can create money requests"
ON public.money_requests FOR INSERT
WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their money requests" ON public.money_requests;
CREATE POLICY "Users can update their money requests"
ON public.money_requests FOR UPDATE
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their money requests" ON public.money_requests;
CREATE POLICY "Users can delete their money requests"
ON public.money_requests FOR DELETE
USING (from_user_id = auth.uid());

-- STEP 7: RLS Policies for split_bills
DROP POLICY IF EXISTS "Users can view split bills they are in" ON public.split_bills;
CREATE POLICY "Users can view split bills they are in"
ON public.split_bills FOR SELECT
USING (
  creator_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM split_bill_participants 
    WHERE split_bill_id = id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create split bills" ON public.split_bills;
CREATE POLICY "Users can create split bills"
ON public.split_bills FOR INSERT
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update their split bills" ON public.split_bills;
CREATE POLICY "Creators can update their split bills"
ON public.split_bills FOR UPDATE
USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can delete their split bills" ON public.split_bills;
CREATE POLICY "Creators can delete their split bills"
ON public.split_bills FOR DELETE
USING (creator_id = auth.uid());

-- STEP 8: RLS Policies for split_bill_participants
DROP POLICY IF EXISTS "Users can view split bill participants" ON public.split_bill_participants;
CREATE POLICY "Users can view split bill participants"
ON public.split_bill_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM split_bills 
    WHERE id = split_bill_id AND creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Creators can add participants" ON public.split_bill_participants;
CREATE POLICY "Creators can add participants"
ON public.split_bill_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM split_bills 
    WHERE id = split_bill_id AND creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can update their status" ON public.split_bill_participants;
CREATE POLICY "Participants can update their status"
ON public.split_bill_participants FOR UPDATE
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM split_bills 
    WHERE id = split_bill_id AND creator_id = auth.uid()
  )
);

-- STEP 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_money_requests_from_user ON public.money_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_money_requests_to_user ON public.money_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_money_requests_status ON public.money_requests(status);
CREATE INDEX IF NOT EXISTS idx_split_bills_creator ON public.split_bills(creator_id);
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_user ON public.split_bill_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_bill ON public.split_bill_participants(split_bill_id);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_friend ON public.lend_borrow(friend_id);

-- STEP 10: Create helper views
CREATE OR REPLACE VIEW money_requests_with_users AS
SELECT 
  mr.id,
  mr.from_user_id,
  mr.to_user_id,
  mr.amount,
  mr.currency,
  mr.description,
  mr.request_type,
  mr.status,
  mr.due_date,
  mr.created_at,
  mr.updated_at,
  COALESCE(p_from.first_name || ' ' || p_from.last_name, p_from.username) as from_user_name,
  p_from.email as from_user_email,
  COALESCE(p_to.first_name || ' ' || p_to.last_name, p_to.username) as to_user_name,
  p_to.email as to_user_email
FROM money_requests mr
LEFT JOIN profiles p_from ON mr.from_user_id = p_from.id
LEFT JOIN profiles p_to ON mr.to_user_id = p_to.id;

GRANT SELECT ON money_requests_with_users TO authenticated;

CREATE OR REPLACE VIEW split_bills_summary AS
SELECT 
  sb.id,
  sb.creator_id,
  sb.title,
  sb.description,
  sb.total_amount,
  sb.currency,
  sb.split_type,
  sb.status,
  sb.created_at,
  COALESCE(p.first_name || ' ' || p.last_name, p.username) as creator_name,
  COUNT(sbp.id) as participant_count,
  SUM(CASE WHEN sbp.status = 'paid' THEN 1 ELSE 0 END) as paid_count
FROM split_bills sb
LEFT JOIN profiles p ON sb.creator_id = p.id
LEFT JOIN split_bill_participants sbp ON sb.id = sbp.split_bill_id
GROUP BY sb.id, sb.creator_id, sb.title, sb.description, sb.total_amount, 
         sb.currency, sb.split_type, sb.status, sb.created_at, p.first_name, 
         p.last_name, p.username;

GRANT SELECT ON split_bills_summary TO authenticated;

-- STEP 11: Function to auto-update split bill status
CREATE OR REPLACE FUNCTION update_split_bill_status()
RETURNS TRIGGER AS $$
DECLARE
  total_participants INTEGER;
  paid_participants INTEGER;
BEGIN
  -- Count participants
  SELECT COUNT(*) INTO total_participants
  FROM split_bill_participants
  WHERE split_bill_id = NEW.split_bill_id;
  
  -- Count paid participants
  SELECT COUNT(*) INTO paid_participants
  FROM split_bill_participants
  WHERE split_bill_id = NEW.split_bill_id AND status = 'paid';
  
  -- If all paid, mark bill as settled
  IF total_participants > 0 AND total_participants = paid_participants THEN
    UPDATE split_bills
    SET status = 'settled', updated_at = now()
    WHERE id = NEW.split_bill_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_participant_payment ON split_bill_participants;
CREATE TRIGGER on_participant_payment
  AFTER UPDATE ON split_bill_participants
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
  EXECUTE FUNCTION update_split_bill_status();

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- 
-- ✅ Money request system created
-- ✅ Lend/Borrow linked with friends
-- ✅ Split bill functionality added
-- ✅ RLS policies configured
-- ✅ Helper views and triggers created
-- 
-- Now you can:
-- 1. Request money from friends
-- 2. Send money to friends
-- 3. Track lend/borrow with specific friends
-- 4. Split bills among multiple friends
-- 
-- ============================================
