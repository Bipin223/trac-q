import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  user: User | null;
  children: React.ReactNode;
}

const Layout = ({ user, children }: LayoutProps) => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) {
    // This is now a fallback, as ProtectedRoute should prevent this.
    // But it's good practice to keep it.
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} handleLogout={handleLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;