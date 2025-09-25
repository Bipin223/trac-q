import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const redactEmail = (email: string): string => {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return "an email address on file.";

    const start = localPart.substring(0, Math.min(3, localPart.length - 1));
    const end = localPart.length > 3 ? localPart.substring(localPart.length - 1) : '';
    const redacted = start + '*'.repeat(Math.max(0, localPart.length - 4)) + end;
    
    return `${redacted}@${domain}`;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const trimmedIdentifier = identifier.trim();
    let targetEmail = '';
    let emailHint = 'the associated email address.';

    if (trimmedIdentifier.includes('@')) {
      targetEmail = trimmedIdentifier;
      emailHint = redactEmail(targetEmail);
    } else {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', trimmedIdentifier)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "No rows found"
        setError("An error occurred while looking up your account.");
        setLoading(false);
        return;
      }
      
      if (profile && profile.email) {
        targetEmail = profile.email;
        emailHint = redactEmail(targetEmail);
      }
    }

    if (targetEmail) {
      await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    }
    
    setMessage(`If an account exists, password reset instructions have been sent to ${emailHint}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <img src="https://i.imgur.com/MX9Vsqz.png" alt="Trac-Q Logo" className="h-12 w-12 mx-auto" />
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground">
            Enter your username or email and we'll send a reset link.
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

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Username or Email</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="your_username or your_email@example.com"
              required
              disabled={!!message}
            />
          </div>
          <Button type="submit" disabled={loading || !!message} className="w-full">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
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