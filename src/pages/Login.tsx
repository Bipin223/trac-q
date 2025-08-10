import { Auth } from '@supabase/auth-ui-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto lg:grid lg:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Left Panel: Auth Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-card">
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center mb-8">
              <img src="/logo.png" alt="Trac-Q Logo" className="h-12 w-12 mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Trac-Q</h1>
                <p className="text-sm text-muted-foreground">A smart application to 'Track You' :)</p>
              </div>
            </div>
            
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                className: {
                  container: 'space-y-6',
                  button: 'bg-primary hover:bg-primary/90 text-primary-foreground rounded-md py-2.5 text-sm font-semibold w-full',
                  input: 'bg-input border border-border rounded-md mt-2 w-full',
                  label: 'text-sm font-medium text-foreground',
                  anchor: 'text-sm font-semibold text-primary hover:underline',
                  message: 'text-sm text-destructive mt-2',
                  divider: 'text-sm text-muted-foreground',
                },
              }}
              providers={[]}
              theme="light"
            />
          </div>
        </div>

        {/* Right Panel: Welcome Message */}
        <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary via-purple-600 to-purple-800 text-primary-foreground text-center">
          <div className="max-w-xs">
            <h2 className="text-4xl font-bold mb-4">New Here?</h2>
            <p className="text-lg mb-8">
              Sign up and discover a great amount of new opportunities!
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              className="bg-primary-foreground hover:bg-primary-foreground/90 text-primary font-bold w-full"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;