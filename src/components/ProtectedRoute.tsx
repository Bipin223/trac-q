import { Navigate, Outlet } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import Layout from './Layout';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from './ui/skeleton';

interface ProtectedRouteProps {
  session: Session | null;
}

const ProtectedRoute = ({ session }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      const fetchUser = async () => {
        // The user might be in the session already, but getUser() is the most reliable way
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setLoading(false);
      };
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [session]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-8">
        <div className="w-full space-y-4">
            <Skeleton className="h-12 w-1/4 bg-gray-200 dark:bg-gray-800" />
            <div className="grid grid-cols-4 gap-6">
                <Skeleton className="col-span-2 h-48 bg-gray-200 dark:bg-gray-800" />
                <Skeleton className="col-span-2 h-48 bg-gray-200 dark:bg-gray-800" />
                <Skeleton className="h-48 bg-gray-200 dark:bg-gray-800" />
                <Skeleton className="h-48 bg-gray-200 dark:bg-gray-800" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;