-- ============================================
-- USER ACCOUNT DELETION FUNCTION
-- Run this in Supabase SQL Editor
-- ============================================

-- Create function to delete user account and all associated data
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all user data from tables (cascading will handle some, but explicit is better)
  DELETE FROM lend_borrow WHERE user_id = user_id_to_delete;
  DELETE FROM budgets WHERE user_id = user_id_to_delete;
  DELETE FROM expenses WHERE user_id = user_id_to_delete;
  DELETE FROM incomes WHERE user_id = user_id_to_delete;
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  -- Delete the auth user
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RAISE NOTICE 'User % and all associated data deleted successfully', user_id_to_delete;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- ============================================
-- USAGE
-- ============================================
-- To delete a user account from the client:
-- await supabase.rpc('delete_user_account', { user_id_to_delete: user.id });
