import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('If an account with this email exists, password reset instructions have been sent.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <img src="https://i.imgur.com/MX9Vsqz.png" alt="Trac-Q Logo" className="h-12 w-12 mx-auto" />
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a link to reset your password.
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your_email@example.com"
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