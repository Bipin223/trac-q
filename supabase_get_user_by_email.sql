-- Create function to get user by email from auth.users table
-- This allows the forgot password flow to find users by their email
-- Run this SQL in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at
  FROM auth.users au
  WHERE au.email = user_email;
END;
$$;

-- Grant execute permissions to allow anyone to use this function
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO anon;
