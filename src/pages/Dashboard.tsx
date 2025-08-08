import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome, {user?.email?.split('@')[0] || 'User'}!
          </h1>
          <Button onClick={handleLogout} variant="destructive">Logout</Button>
        </header>
        <main>
          <div className="text-center py-20 px-4 border-2 border-dashed border-gray-700 rounded-lg">
            <h2 className="text-xl font-medium text-gray-300">Dashboard Under Construction</h2>
            <p className="text-gray-400 mt-2">Exciting things are coming soon. We're building your futuristic expense tracker!</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;