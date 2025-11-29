import { useState, useEffect, useRef } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Mail, Lock, User, Eye, EyeOff, User as UserIcon, LogOut, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RememberedUser {
  username: string;
  password: string;
}

const REMEMBERED_USERS_KEY = 'tracq-remembered-users';
const MAX_REMEMBERED_USERS = 5;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(location.state?.signUp || false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showUserExistsOptions, setShowUserExistsOptions] = useState(false);
  const [rememberedUsers, setRememberedUsers] = useState<RememberedUser[]>([]);
  const [passwordInputRef, setPasswordInputRef] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();

    // Load remembered users from localStorage
    const storedUsers = localStorage.getItem(REMEMBERED_USERS_KEY);
    if (storedUsers) {
      try {
        setRememberedUsers(JSON.parse(storedUsers));
      } catch (e) {
        console.error('Failed to parse remembered users:', e);
        localStorage.removeItem(REMEMBERED_USERS_KEY);
      }
    }
  }, [navigate]);

  const addToRememberedUsers = (newUser: RememberedUser) => {
    const existingIndex = rememberedUsers.findIndex(u => u.username === newUser.username);
    let updatedUsers: RememberedUser[];
    if (existingIndex > -1) {
      // Update existing
      updatedUsers = rememberedUsers.map((u, i) => i === existingIndex ? newUser : u);
    } else {
      // Add new, remove oldest if at max
      updatedUsers = [newUser, ...rememberedUsers].slice(0, MAX_REMEMBERED_USERS);
    }
    setRememberedUsers(updatedUsers);
    localStorage.setItem(REMEMBERED_USERS_KEY, JSON.stringify(updatedUsers));
  };

  const removeFromRememberedUsers = (usernameToRemove: string) => {
    const updatedUsers = rememberedUsers.filter(u => u.username !== usernameToRemove);
    setRememberedUsers(updatedUsers);
    localStorage.setItem(REMEMBERED_USERS_KEY, JSON.stringify(updatedUsers));
  };

  const handleQuickLogin = async (selectedUser: RememberedUser) => {
    setLoading(true);
    setError(null);

    // Set form values
    setUsername(selectedUser.username);
    setPassword(selectedUser.password);

    // Perform sign-in
    const { data: emailFromUsername, error: rpcError } = await supabase.rpc('get_email_from_username', {
      p_username: selectedUser.username.trim(),
    });

    if (rpcError || !emailFromUsername) {
      setError('Invalid credentials for remembered user.');
      removeFromRememberedUsers(selectedUser.username); // Clear invalid entry
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailFromUsername,
      password: selectedUser.password,
    });

    if (signInError) {
      setError(`Login failed for ${selectedUser.username}: ${signInError.message}`);
      removeFromRememberedUsers(selectedUser.username); // Clear invalid entry
    } else {
      // Success - navigate to dashboard
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowUserExistsOptions(false);

    let authError = null;

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
          },
          emailRedirectTo: 'https://fgyoexlosyvvgumpzgwe.dyad.sh/',
        },
      });
      authError = error;
      if (!authError) {
        setSuccess("Sign-up successful! Please check your email to verify your account, then sign in.");
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setUsername('');
        setRememberMe(false);
      } else {
        if (error.message.toLowerCase().includes('user already registered')) {
          setShowUserExistsOptions(true);
        }
      }
    } else {
      // Sign in with username
      const { data: emailFromUsername, error: rpcError } = await supabase.rpc('get_email_from_username', {
        p_username: username.trim(),
      });

      if (rpcError || !emailFromUsername) {
        setError('Invalid username or password.');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailFromUsername,
        password,
      });
      
      authError = signInError;
      if (!authError) {
        // Handle remember me logic - save credentials if requested
        if (rememberMe) {
          addToRememberedUsers({ username: username.trim(), password });
        }
        // Navigate to dashboard - session persists regardless of Remember Me
        navigate('/dashboard');
      }
    }

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  const hasRememberedUsers = rememberedUsers.length > 0 && !isSignUp;

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
      {/* Floating Quick Login Button - Only for sign-in mode with remembered users */}
      {hasRememberedUsers && (
        <div className="fixed top-16 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={loading}>
                <UserIcon className="h-4 w-4" />
                Quick Login ({rememberedUsers.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Remembered Users</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {rememberedUsers.map((user) => (
                <DropdownMenuItem 
                  key={user.username} 
                  onClick={() => handleQuickLogin(user)} 
                  className="flex justify-between items-center cursor-pointer"
                  disabled={loading}
                >
                  <span className="truncate">{user.username}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromRememberedUsers(user.username);
                    }}
                    className="h-6 w-6 p-0 ml-2"
                    disabled={loading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
              {rememberedUsers.length >= MAX_REMEMBERED_USERS && (
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                  Max {MAX_REMEMBERED_USERS} users remembered
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 space-y-6 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center ~gap-4 w-full">
              <img src="/logo.png" alt="Trac-Q Logo" className="h-24 w-24 -ml-12" />
              <h1 className="text-3xl font-bold -ml-4">Trac-Q</h1>
            </div>
            <p className="text-muted-foreground text-center mt-2">A Modern Finance app to 'Track You'</p>
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

          {showUserExistsOptions && (
            <div className="p-4 border border-muted-foreground/20 bg-muted/50 rounded-lg space-y-3 text-center">
                <p className="text-sm font-medium text-foreground">It looks like you already have an account.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="w-full" onClick={() => {
                        setIsSignUp(false);
                        setError(null);
                        setShowUserExistsOptions(false);
                    }}>
                        Sign In Instead
                    </Button>
                    <Button variant="secondary" className="w-full" disabled={loading}>
                      <Link to="/forgot-password" className="no-underline">Forgot Password?</Link>
                    </Button>
                </div>
            </div>
          )}

          {success && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAuthAction} className="space-y-4">
            {isSignUp ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username-signup">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="username-signup"
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
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="username-login">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="username-login"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="pl-10 bg-transparent"
                    disabled={loading}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={el => setPasswordInputRef(el)}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  required
                  className="pl-10 pr-10 bg-transparent"
                  disabled={loading}
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
               {!isSignUp && (
                <div className="flex justify-end mt-2">
                  {loading ? (
                    <span className="text-sm text-muted-foreground">Forgot your password?</span>
                  ) : (
                    <Link
                      to="/forgot-password"
                      className="text-sm underline"
                    >
                      Forgot your password?
                    </Link>
                  )}
                </div>
              )}
            </div>
            {!isSignUp && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="remember" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Remember me
                </Label>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Logging in...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
                setShowUserExistsOptions(false);
                setRememberMe(false);
              }}
              className="underline font-semibold disabled:opacity-50"
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-100 via-blue-100 to-white dark:from-purple-900/50 dark:to-blue-900/50">
          <img src="https://i.imgur.com/nAG1Nb2.jpeg" alt="Financial planning illustration" className="w-full max-w-sm" />
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