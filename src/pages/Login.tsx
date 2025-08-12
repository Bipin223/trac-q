import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, User, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const DUMMY_DOMAIN = 'trac-q.app';

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const email = `${username.trim()}@${DUMMY_DOMAIN}`;

    let authError = null;

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
          },
        },
      });
      authError = error;
      if (!authError) {
        setSuccess("Sign-up successful! Please sign in with your new credentials.");
        setIsSignUp(false);
        setUsername('');
        setPassword('');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authError = error;
      if (!authError) {
        navigate('/');
      }
    }

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white dark:from-gray-900 dark:via-purple-900/80 dark:to-blue-900/80 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 space-y-6 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
          <div className="space-y-2 text-center">
            <img src="https://i.imgur.com/MX9Vsqz.png" alt="Trac-Q Logo" className="h-12 w-12 mx-auto" />
            <h1 className="text-3xl font-bold">Trac-Q</h1>
            <p className="text-muted-foreground">A Modern Finance app to 'Track You' :)</p>
          </div>
          
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">
              {isSignUp ? 'Create an Account' : 'Welcome Back!'}
            </h2>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAuthAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="pl-10 bg-transparent"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  required
                  className="pl-10 bg-transparent"
                />
              </div>
               {!isSignUp && (
                <div className="flex justify-end mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-sm underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              )}
            </div>
            {!isSignUp && (
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" />
                <label
                  htmlFor="remember-me"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </label>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="underline font-semibold"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-100 via-blue-100 to-white dark:from-purple-900/50 dark:to-blue-900/50">
          <img src="https://i.imgur.com/aO4j2kF.png" alt="Financial planning illustration" className="w-full max-w-sm" />
          <div className="text-center mt-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Manage Your Finances with Ease</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Your all-in-one solution for tracking expenses, creating budgets, and achieving your financial goals.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;