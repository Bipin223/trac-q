import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Tag, DollarSign, BarChart2, ArrowRightLeft, User, Landmark } from 'lucide-react';

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

  const dashboardItems = [
    {
      to: '/accounts',
      icon: <Landmark className="h-6 w-6" />,
      title: 'Accounts',
      description: 'Manage your cash, bank, and credit accounts.'
    },
    {
      to: '/budgets',
      icon: <Tag className="h-6 w-6" />,
      title: 'Budgets',
      description: 'Set spending limits and track your categories.'
    },
    {
      to: '/incomes',
      icon: <DollarSign className="h-6 w-6" />,
      title: 'Incomes',
      description: 'Log your earnings and manage income sources.'
    },
    {
      to: '/expenses',
      icon: <BarChart2 className="h-6 w-6" />,
      title: 'Expenses',
      description: 'Record your spending and analyze your habits.'
    },
    {
      to: '/exchange-rates',
      icon: <ArrowRightLeft className="h-6 w-6" />,
      title: 'Exchange Rates',
      description: 'Check currency conversions and rates.'
    },
    {
      to: '/profile',
      icon: <User className="h-6 w-6" />,
      title: 'Profile',
      description: 'Manage your account and personal settings.'
    }
  ];

  return (
    <div className="space-y-6">
      {profile && (
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {profile.username}!
        </h1>
      )}
      <p className="text-muted-foreground">
        Welcome to your financial dashboard. Here's a quick overview of your tools.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map(item => (
          <DashboardCard key={item.to} {...item} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;