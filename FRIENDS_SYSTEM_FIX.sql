-- ============================================
-- FRIENDS SYSTEM FIX - Run this in Supabase SQL Editor
-- ============================================
-- This fixes the friend request functionality
-- ============================================

-- STEP 1: Fix profiles RLS - Allow users to view other users' basic info
-- This is needed so users can search for friends by friend code
DROP POLICY IF EXISTS "Users can view other profiles for friend requests" ON public.profiles;
CREATE POLICY "Users can view other profiles for friend requests"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id 
  OR 
  -- Allow viewing basic info of other users (for friend system)
  auth.uid() IS NOT NULL
);

-- STEP 2: Fix friends table RLS policies
-- The issue is that when User A sends a request to User B:
-- user_id = B (recipient), friend_id = A (sender), requested_by = A
-- But current policy requires user_id = auth.uid(), which would be A, not B!

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friends;
DROP POLICY IF EXISTS "Users can update their friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friends;

-- Create better policies

-- Allow users to view friendships where they are involved (either as user or friend)
CREATE POLICY "Users can view their friendships"
ON public.friends FOR SELECT
USING (
  user_id = auth.uid() OR friend_id = auth.uid() OR requested_by = auth.uid()
);

-- Allow users to create friend requests
-- They can insert a record where THEY are the requested_by user
CREATE POLICY "Users can send friend requests"
ON public.friends FOR INSERT
WITH CHECK (
  requested_by = auth.uid()
);

-- Allow users to update friend requests where they are the recipient (user_id)
CREATE POLICY "Users can accept/reject requests sent to them"
ON public.friends FOR UPDATE
USING (
  user_id = auth.uid()
);

-- Allow users to delete friendships where they are involved
CREATE POLICY "Users can remove friendships"
ON public.friends FOR DELETE
USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

-- STEP 3: Create a function to handle bidirectional friendships
-- When a friendship is accepted, create the reverse record automatically
CREATE OR REPLACE FUNCTION handle_friendship_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Create the reciprocal friendship record
    -- If A sent request to B (user_id=B, friend_id=A, requested_by=A)
    -- Create B to A friendship (user_id=A, friend_id=B, requested_by=A)
    INSERT INTO public.friends (user_id, friend_id, status, requested_by, method)
    VALUES (NEW.friend_id, NEW.user_id, 'accepted', NEW.requested_by, NEW.method)
    ON CONFLICT (user_id, friend_id) 
    DO UPDATE SET status = 'accepted', updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_friendship_accepted ON public.friends;
CREATE TRIGGER on_friendship_accepted
  AFTER INSERT OR UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION handle_friendship_accepted();

-- STEP 4: Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_requested_by ON public.friends(requested_by);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);

-- STEP 5: Add a helper view for easier friend queries
CREATE OR REPLACE VIEW user_friendships AS
SELECT 
  f.id,
  f.user_id,
  f.friend_id,
  f.status,
  f.requested_by,
  f.created_at,
  f.method,
  CASE 
    WHEN f.requested_by = f.user_id THEN 'sent'
    ELSE 'received'
  END as request_direction,
  p_user.full_name as user_name,
  p_user.email as user_email,
  p_friend.full_name as friend_name,
  p_friend.email as friend_email
FROM friends f
LEFT JOIN profiles p_user ON f.user_id = p_user.id
LEFT JOIN profiles p_friend ON f.friend_id = p_friend.id;

-- Grant access to the view
GRANT SELECT ON user_friendships TO authenticated;

-- ============================================
-- TESTING QUERIES (Run these to verify)
-- ============================================

-- Check your friend code
-- SELECT friend_code FROM profiles WHERE id = auth.uid();

-- Check all friend requests (pending)
-- SELECT * FROM user_friendships WHERE status = 'pending' AND user_id = auth.uid();

-- Check all friends (accepted)
-- SELECT * FROM user_friendships WHERE status = 'accepted' AND (user_id = auth.uid() OR friend_id = auth.uid());

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- 
-- ✅ Fixed profiles RLS - users can now see other profiles
-- ✅ Fixed friends RLS - proper permission for sending requests
-- ✅ Added bidirectional friendship creation
-- ✅ Added helper view for easier queries
-- 
-- Now try sending a friend request again!
-- ============================================
