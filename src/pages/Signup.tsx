import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate inputs
    if (!username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUsername, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
        throw usernameCheckError;
      }

      if (existingUsername) {
        setError('This username is already taken. Please choose a different username.');
        setLoading(false);
        return;
      }

      // Attempt to sign up
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
          },
          emailRedirectTo: window.location.origin + '/login',
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('user already registered')) {
          setError('This email is already registered. Please login instead, or use "Forgot Password" if you need to reset it.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
      } else {
        // Show success dialog
        setShowSuccessDialog(true);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    // Clear form
    setEmail('');
    setPassword('');
    setUsername('');
    // Navigate to login page
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white dark:from-gray-900 dark:via-purple-900/80 dark:to-blue-900/80 p-4 relative">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Button>
        </Link>
      </div>
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 space-y-6 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 w-full">
              <img src="/logo.png" alt="Trac-Q Logo" className="h-24 w-24 -ml-12" />
              <h1 className="text-3xl font-bold -ml-4">Trac-Q</h1>
            </div>
            <p className="text-muted-foreground text-center mt-2">A Modern Finance app to 'Track You'</p>
          </div>
          
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">Create an Account</h2>
            <p className="text-sm text-muted-foreground">Get started with Trac-Q today</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  className="pl-10 bg-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="pl-10 bg-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password (min. 6 characters)"
                  required
                  className="pl-10 pr-10 bg-transparent"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-100 via-blue-100 to-white dark:from-purple-900/50 dark:to-blue-900/50">
          <img src="https://i.imgur.com/nAG1Nb2.jpeg" alt="Financial planning illustration" className="w-full max-w-sm" />
          <div className="text-center mt-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Start Your Financial Journey</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Join thousands of users who manage their finances efficiently with Trac-Q.</p>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Account Created Successfully!</DialogTitle>
            <DialogDescription className="text-center space-y-2">
              <p>Welcome to Trac-Q! Your account has been created.</p>
              <p className="text-sm text-muted-foreground">
                Please check your email to verify your account, then sign in to get started.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={handleSuccessDialogClose} className="w-full">
              Continue to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Signup;
