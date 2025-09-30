-- Create password_reset_otps table for OTP-based password reset
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_otps_user_id ON password_reset_otps(user_id);
CREATE INDEX idx_password_reset_otps_otp_code ON password_reset_otps(otp_code);
CREATE INDEX idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);

-- Enable Row Level Security
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

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

-- You can set up a cron job to run this function periodically
-- Or call it manually: SELECT cleanup_expired_otps();
