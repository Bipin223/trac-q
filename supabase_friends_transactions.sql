-- Friends System and Transaction Acceptance Feature
-- This allows users to connect with friends and send/receive transactions that require mutual acceptance

-- ============================================
-- FRIENDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Index for faster friend lookups
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id, status);

-- ============================================
-- FRIEND INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS friend_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_friend_invitations_token ON friend_invitations(token);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_inviter ON friend_invitations(inviter_id);

-- ============================================
-- PENDING TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('lend', 'borrow', 'payment', 'gift', 'split')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_receiver', 'pending_sender', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending_receiver',
  sender_accepted BOOLEAN DEFAULT FALSE,
  receiver_accepted BOOLEAN DEFAULT FALSE,
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_date DATE DEFAULT CURRENT_DATE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pending transactions
CREATE INDEX IF NOT EXISTS idx_pending_trans_sender ON pending_transactions(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_trans_receiver ON pending_transactions(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_trans_status ON pending_transactions(status);

-- ============================================
-- TRANSACTION HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_transaction_id UUID REFERENCES pending_transactions(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  transaction_type TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for transaction history
CREATE INDEX IF NOT EXISTS idx_trans_history_sender ON transaction_history(sender_id);
CREATE INDEX IF NOT EXISTS idx_trans_history_receiver ON transaction_history(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trans_history_date ON transaction_history(transaction_date);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Friends table policies
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships" ON friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON friends
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can update their friend requests" ON friends
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships" ON friends
  FOR DELETE USING (auth.uid() = user_id);

-- Friend invitations policies
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invitations" ON friend_invitations
  FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations" ON friend_invitations
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their invitations" ON friend_invitations
  FOR UPDATE USING (auth.uid() = inviter_id);

-- Pending transactions policies
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions they're part of" ON pending_transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create pending transactions" ON pending_transactions
  FOR INSERT WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update transactions they're part of" ON pending_transactions
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete their pending transactions" ON pending_transactions
  FOR DELETE USING (auth.uid() = initiated_by);

-- Transaction history policies
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transaction history" ON transaction_history
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "System can insert transaction history" ON transaction_history
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to accept a pending transaction
CREATE OR REPLACE FUNCTION accept_pending_transaction(
  transaction_id UUID,
  user_id UUID
) RETURNS JSONB AS $$
DECLARE
  trans RECORD;
  result JSONB;
BEGIN
  -- Get the transaction
  SELECT * INTO trans FROM pending_transactions WHERE id = transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Update acceptance status
  IF trans.sender_id = user_id THEN
    UPDATE pending_transactions SET sender_accepted = true, updated_at = NOW() WHERE id = transaction_id;
  ELSIF trans.receiver_id = user_id THEN
    UPDATE pending_transactions SET receiver_accepted = true, updated_at = NOW() WHERE id = transaction_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Check if both parties accepted
  SELECT * INTO trans FROM pending_transactions WHERE id = transaction_id;
  
  IF trans.sender_accepted AND trans.receiver_accepted THEN
    -- Move to transaction history
    INSERT INTO transaction_history (
      pending_transaction_id, sender_id, receiver_id, amount, description,
      transaction_type, category_id, transaction_date
    ) VALUES (
      trans.id, trans.sender_id, trans.receiver_id, trans.amount, trans.description,
      trans.transaction_type, trans.category_id, trans.transaction_date
    );
    
    -- Update status
    UPDATE pending_transactions 
    SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
    WHERE id = transaction_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'completed');
  ELSE
    RETURN jsonb_build_object('success', true, 'status', 'pending');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token() RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    token := encode(gen_random_bytes(12), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    
    SELECT EXISTS(SELECT 1 FROM friend_invitations WHERE token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE friends IS 'Stores friend connections between users';
COMMENT ON TABLE friend_invitations IS 'Stores invitation links/QR codes for adding friends';
COMMENT ON TABLE pending_transactions IS 'Stores transactions awaiting acceptance from both parties';
COMMENT ON TABLE transaction_history IS 'Stores completed/accepted transactions';
COMMENT ON FUNCTION accept_pending_transaction IS 'Handles acceptance of pending transactions with dual approval';
