-- Create function to update user password
-- This function allows updating a user's password without requiring authentication
-- Run this SQL in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION update_user_password(
  user_id UUID,
  new_password TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = user_id;
  
  -- If no rows were updated, raise an exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO anon;
