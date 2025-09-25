import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Mail, User } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: Find account, 2: Confirm email
  const [identifier, setIdentifier] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const redactEmail = (email: string): string => {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return "a hidden email address.";

    const start = localPart.substring(0, 2);
    const redacted = start + '*'.repeat(localPart.length - 2);
    
    return `${redacted}@${domain}`;
  };

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedIdentifier = identifier.trim();
    let targetEmail = '';

    if (trimmedIdentifier.includes('@')) {
      targetEmail = trimmedIdentifier;
    } else {
      const { data, error: rpcError } = await supabase.rpc('get_email_from_username', {
        p_username: trimmedIdentifier,
      });
      if (rpcError) console.error('RPC Error:', rpcError);
      if (data) targetEmail = data;
    }

    if (targetEmail) {
      setFoundEmail(targetEmail);
      setStep(2);
    } else {
      setError('No account found with that username or email. Please try again.');
    }
    setLoading(false);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (confirmedEmail.trim().toLowerCase() !== foundEmail.toLowerCase()) {
      setError('The email address you entered does not match our records.');
      setLoading(false);
      return;
    }

    await supabase.auth.resetPasswordForEmail(foundEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    setMessage(`Success! A password reset link has been sent to ${foundEmail}.`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <img src="https://i.imgur.com/MX9Vsqz.png" alt="Trac-Q Logo" className="h-12 w-12 mx-auto" />
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground">
            {step === 1 ? "Enter your username or email to find your account." : "Confirm your email to receive a reset link."}
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
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {step === 1 ? (
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
                  placeholder="your_username or your_email@example.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Searching...' : 'Find Account'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md text-center">
              <p className="text-sm text-muted-foreground">Account found with email:</p>
              <p className="font-semibold">{redactEmail(foundEmail)}</p>
            </div>
            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-email">Enter Your Full Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirm-email"
                    type="email"
                    value={confirmedEmail}
                    onChange={(e) => setConfirmedEmail(e.target.value)}
                    placeholder="Confirm your full email address"
                    required
                    disabled={!!message}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || !!message} className="w-full">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </div>
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