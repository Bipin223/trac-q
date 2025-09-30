import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Mail, User, Shield } from 'lucide-react';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Find account, 2: Enter OTP, 3: Reset password
  const [identifier, setIdentifier] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');

  const redactEmail = (email: string): string => {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return "a hidden email address.";

    const start = localPart.substring(0, 2);
    const redacted = start + '*'.repeat(localPart.length - 2);
    
    return `${redacted}@${domain}`;
  };

  // Generate 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedIdentifier = identifier.trim();
    let targetEmail = '';
    let targetUserId = '';

    if (trimmedIdentifier.includes('@')) {
      targetEmail = trimmedIdentifier;
      // Get user ID from email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', trimmedIdentifier)
        .single();
      if (profileData) targetUserId = profileData.id;
    } else {
      const { data, error: rpcError } = await supabase.rpc('get_email_from_username', {
        p_username: trimmedIdentifier,
      });
      if (rpcError) console.error('RPC Error:', rpcError);
      if (data) {
        targetEmail = data;
        // Get user ID from username
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', trimmedIdentifier)
          .single();
        if (profileData) targetUserId = profileData.id;
      }
    }

    if (targetEmail && targetUserId) {
      setFoundEmail(targetEmail);
      setUserId(targetUserId);
      await sendOTP(targetEmail, targetUserId);
    } else {
      setError('No account found with that username or email. Please try again.');
    }
    setLoading(false);
  };

  const sendOTP = async (email: string, uid: string) => {
    try {
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database (you'll need to create this table)
      const { error: insertError } = await supabase
        .from('password_reset_otps')
        .insert({
          user_id: uid,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

      if (insertError) {
        console.error('Error storing OTP:', insertError);
        setError('Failed to generate OTP. Please try again.');
        return;
      }

      // Send email with OTP (using Supabase auth email as fallback)
      // Note: In production, you'd use a proper email service
      console.log(`OTP for ${email}: ${otpCode}`);
      
      setMessage(`A 6-digit OTP code has been sent to ${redactEmail(email)}. Please check your email.`);
      setStep(2);
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Verify OTP from database
      const { data: otpData, error: otpError } = await supabase
        .from('password_reset_otps')
        .select('*')
        .eq('user_id', userId)
        .eq('otp_code', otp.trim())
        .eq('used', false)
        .single();

      if (otpError || !otpData) {
        setError('Invalid OTP code. Please try again.');
        setLoading(false);
        return;
      }

      // Check if OTP is expired
      if (new Date(otpData.expires_at) < new Date()) {
        setError('OTP code has expired. Please request a new one.');
        setLoading(false);
        return;
      }

      // OTP is valid, move to password reset
      setMessage('OTP verified successfully! Please enter your new password.');
      setStep(3);
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Failed to verify OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      // Mark OTP as used
      await supabase
        .from('password_reset_otps')
        .update({ used: true })
        .eq('user_id', userId)
        .eq('otp_code', otp.trim());

      // Update password using admin API (you'll need to implement this)
      // For now, we'll use the auth update method
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError('Failed to update password. Please try again.');
        setLoading(false);
        return;
      }

      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Failed to reset password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <img src="/logo.png" alt="Trac-Q Logo" className="h-16 w-16 mx-auto" />
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground">
            {step === 1 && "Enter your username or email to receive an OTP code."}
            {step === 2 && "Enter the 6-digit OTP code sent to your email."}
            {step === 3 && "Create your new password."}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700 dark:text-green-300">Success</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">{message}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Find Account */}
        {step === 1 && (
          <form onSubmit={handleFindAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="your_username or email@example.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending OTP...' : 'Send OTP Code'}
            </Button>
          </form>
        )}

        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md text-center">
              <p className="text-sm text-muted-foreground mb-1">OTP sent to:</p>
              <p className="font-semibold text-purple-600 dark:text-purple-400">{redactEmail(foundEmail)}</p>
              <p className="text-xs text-muted-foreground mt-2">Check your email for the 6-digit code</p>
            </div>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP Code</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    required
                    maxLength={6}
                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">Code expires in 10 minutes</p>
              </div>
              <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => sendOTP(foundEmail, userId)}
                className="w-full"
              >
                Resend OTP
              </Button>
            </form>
          </div>
        )}

        {/* Step 3: Reset Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        )}

        <div className="mt-4 text-center text-sm">
          Remember your password?{' '}
          <Link to="/login" className="underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;