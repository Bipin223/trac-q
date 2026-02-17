import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Use our custom Edge Function for premium email layout and reliable link generation
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email: email.trim(),
          type: 'recovery',
          redirectTo: `${window.location.origin}/reset-password`,
        }
      });

      if (functionError) {
        console.error('Edge Function recovery error:', functionError);
        // Fallback to native reset if something is wrong with the function environment
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
      }

      setMessage('A stunning recovery email has been sent to your inbox. Please check it to reset your password.');
    } catch (err) {
      console.error('Error requesting password reset:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 leading-relaxed tracking-tight">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95">
            <img src="/logo.png" alt="Trac-Q Logo" className="h-20 w-20 mx-auto" />
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight">Reset Password</h1>
          <p className="text-muted-foreground text-lg">
            {!message
              ? "Enter your email address and we'll send you a recovery link."
              : "Check your email to continue."
            }
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message ? (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <Alert className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 p-6">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-200 text-lg font-bold">Link Sent!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300 mt-2">
                {message}
              </AlertDescription>
            </Alert>
            <Button asChild variant="outline" className="w-full py-6 text-lg">
              <Link to="/login" className="flex items-center justify-center gap-2">
                <ArrowLeft className="h-5 w-5" />
                Return to Login
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-purple-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="pl-12 py-6 text-lg bg-secondary/30 border-secondary focus:ring-2 focus:ring-purple-500/20"
                  disabled={loading}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-purple-500/20"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </Button>
            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
