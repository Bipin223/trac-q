import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { AugustExpenseCard } from "@/components/dashboard/AugustExpenseCard";
import { AssetSummaryCard } from "@/components/dashboard/AssetSummaryCard";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TrendsCard } from "@/components/dashboard/TrendsCard";
import { Calendar, CalendarDays, CalendarRange, BarChartHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    fetchUser();
  }, []);

  if (loading || !user) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AugustExpenseCard />
        <AssetSummaryCard />
        <SummaryCard 
          title="Today" 
          icon={<Calendar className="h-5 w-5" />} 
          period="August 4, 2025" 
        />
        <SummaryCard 
          title="This Week" 
          icon={<CalendarDays className="h-5 w-5" />} 
          period="August 3-August 9" 
        />
        <TrendsCard />
        <SummaryCard 
          title="This Month" 
          icon={<CalendarRange className="h-5 w-5" />} 
          period="August 2025" 
        />
        <SummaryCard 
          title="This Year" 
          icon={<BarChartHorizontal className="h-5 w-5" />} 
          period="2025" 
        />
      </div>
    </Layout>
  );
};

export default Dashboard;