-- ============================================
-- COMPLETE FORGOT PASSWORD SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Step 1: Create password_reset_otps table
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id ON password_reset_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_otp_code ON password_reset_otps(otp_code);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);

-- Enable Row Level Security
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own OTPs" ON password_reset_otps;
DROP POLICY IF EXISTS "Anyone can insert OTPs" ON password_reset_otps;
DROP POLICY IF EXISTS "Users can update their own OTPs" ON password_reset_otps;

-- Create policy to allow users to read their own OTPs
CREATE POLICY "Users can read their own OTPs"
  ON password_reset_otps
  FOR SELECT
  USING (true);

-- Create policy to allow anyone to insert OTPs (for password reset)
CREATE POLICY "Anyone can insert OTPs"
  ON password_reset_otps
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow users to update their own OTPs
CREATE POLICY "Users can update their own OTPs"
  ON password_reset_otps
  FOR UPDATE
  USING (true);

-- Create function to clean up expired OTPs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_otps
  WHERE expires_at < NOW() OR (used = TRUE AND created_at < NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create function to get user by email
-- ============================================

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO anon;

-- Step 3: Create password update function
-- ============================================

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO anon;

-- ============================================
-- SETUP COMPLETE!
-- ============================================

-- Next steps:
-- 1. Deploy the edge function: supabase functions deploy send-otp-email
-- 2. Set RESEND_API_KEY in Supabase dashboard
-- 3. Test the forgot password flow

-- Optional: Run cleanup function manually
-- SELECT cleanup_expired_otps();

-- Optional: Set up a cron job to run cleanup automatically
-- You can do this in Supabase Dashboard > Database > Cron Jobs
