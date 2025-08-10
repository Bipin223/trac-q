import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const PlaceholderPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();
  const pageName = location.pathname.substring(1).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  return (
    <Layout user={user}>
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl font-bold tracking-tight">{pageName || "Page"}</h1>
        <p className="text-muted-foreground mt-2">This page is under construction.</p>
      </div>
    </Layout>
  );
};

export default PlaceholderPage;