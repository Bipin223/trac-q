import { AugustExpenseCard } from "@/components/dashboard/AugustExpenseCard";
import { AssetSummaryCard } from "@/components/dashboard/AssetSummaryCard";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TrendsCard } from "@/components/dashboard/TrendsCard";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CalendarDays, CalendarRange, BarChartHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

interface Profile {
  username: string;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {profile && (
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {profile.username}!
        </h1>
      )}
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
    </div>
  );
};

export default Dashboard;