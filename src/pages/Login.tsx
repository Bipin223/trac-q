import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const DUMMY_DOMAIN = 'trac-q.app';

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authError = error;
    }

    if (authError) {
      setError(authError.message);
    } else if (!isSignUp) {
      navigate('/');
    } else {
      setError("Sign-up successful! Please check your email to verify your account if required, then sign in.");
      setIsSignUp(false); // Switch to sign-in view after successful sign-up
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto lg:grid lg:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Left Panel: Auth Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-card">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <img src="/logo.png" alt="Trac-Q Logo" className="h-16 w-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-foreground">Trac-Q</h1>
              <p className="text-sm text-muted-foreground mt-2">A smart Application to 'Track You'    ( ˃ᴗ˂ )</p>
            </div>
            
            <form onSubmit={handleAuthAction} className="space-y-6">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="mt-2"
                />
              </div>
              {error && (
                <Alert variant={error.includes("successful") ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{error.includes("successful") ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Panel: Welcome Message */}
        <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary via-purple-600 to-purple-800 text-primary-foreground text-center">
          <div className="max-w-xs">
            <h2 className="text-4xl font-bold mb-4">{isSignUp ? 'Welcome Back!' : 'New Here?'}</h2>
            <p className="text-lg mb-8">
              {isSignUp
                ? 'Already have an account? Sign in to continue where you left off.'
                : "Sign up and Manage your finance smartly than ever !"}
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              className="bg-primary-foreground hover:bg-primary-foreground/90 text-primary font-bold w-full"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;