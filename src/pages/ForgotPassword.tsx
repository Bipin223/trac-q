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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const trimmedIdentifier = identifier.trim();
    let targetEmail = '';

    // Check if the identifier is an email or a username
    if (trimmedIdentifier.includes('@')) {
      targetEmail = trimmedIdentifier;
    } else {
      // It's a username, so find the associated email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', trimmedIdentifier)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "No rows found"
        setError("An error occurred while looking up your account.");
        setLoading(false);
        return;
      }
      
      if (profile && profile.email) {
        targetEmail = profile.email;
      }
    }

    // If we found an email, attempt to send the reset link.
    // We proceed even if no email was found to prevent user enumeration attacks.
    if (targetEmail) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      }
    }
    
    // Always show a generic success message for security reasons.
    setMessage('If an account with this username or email exists, password reset instructions have been sent to the associated email address.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <img src="https://i.imgur.com/MX9Vsqz.png" alt="Trac-Q Logo" className="h-12 w-12 mx-auto" />
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground">
            Enter your username or email and we'll send a reset link to your registered email address.
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