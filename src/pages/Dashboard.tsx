import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Tag, DollarSign, BarChart2, ArrowRightLeft, User, Landmark } from 'lucide-react';
import { MonthlySummary } from "@/components/dashboard/MonthlySummary";
import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "../contexts/ProfileContext";

interface ChartData {
  day: string;
  income: number;
  expenses: number;
}

const Dashboard = () => {
  const { profile } = useProfile();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile) {
        setLoadingFinancials(false);
        return;
      }
      
      setLoadingFinancials(true);

      const today = new Date();
      const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const lastDayCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      const { data: incomes } = await supabase.from('incomes').select('amount, income_date').eq('user_id', profile.id).gte('income_date', firstDayCurrentMonth).lte('income_date', lastDayCurrentMonth);
      const { data: expenses } = await supabase.from('expenses').select('amount, expense_date').eq('user_id', profile.id).gte('expense_date', firstDayCurrentMonth).lte('expense_date', lastDayCurrentMonth);

      const monthlyIncome = incomes?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const monthlyExpenses = expenses?.reduce((sum, item) => sum + item.amount, 0) || 0;
      setTotalIncome(monthlyIncome);
      setTotalExpenses(monthlyExpenses);

      const dailyData: ChartData[] = Array.from({ length: daysInMonth }, (_, i) => ({
        day: (i + 1).toString().padStart(2, '0'),
        income: 0,
        expenses: 0,
      }));

      incomes?.forEach(income => {
        const day = new Date(income.income_date).getDate() - 1;
        if (dailyData[day]) dailyData[day].income += income.amount;
      });

      expenses?.forEach(expense => {
        const day = new Date(expense.expense_date).getDate() - 1;
        if (dailyData[day]) dailyData[day].expenses += expense.amount;
      });
      
      setChartData(dailyData);
      setLoadingFinancials(false);
    };

    fetchDashboardData();
  }, [profile]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const dashboardItems = [
    { to: '/accounts', icon: <Landmark className="h-6 w-6" />, title: 'Accounts', description: 'Manage your cash, bank, and credit accounts.' },
    { to: '/budgets', icon: <Tag className="h-6 w-6" />, title: 'Budgets', description: 'Set spending limits and track your categories.' },
    { to: '/incomes', icon: <DollarSign className="h-6 w-6" />, title: 'Incomes', description: 'Log your earnings and manage income sources.' },
    { to: '/expenses', icon: <BarChart2 className="h-6 w-6" />, title: 'Expenses', description: 'Record your spending and analyze your habits.' },
    { to: '/exchange-rates', icon: <ArrowRightLeft className="h-6 w-6" />, title: 'Exchange Rates', description: 'Check currency conversions and rates.' },
    { to: '/profile', icon: <User className="h-6 w-6" />, title: 'Profile', description: 'Manage your account and personal settings.' }
  ];

  if (!profile || loadingFinancials) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-5 w-3/4" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const displayName = profile.username || "Valued User";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()},{" "}
          {profile.role === "admin"
            ? `Admin - ${displayName}`
            : displayName}
          !
        </h1>
        <p className="text-muted-foreground">
          Here's your financial summary for {currentMonth}.
        </p>
      </div>

      <MonthlySummary totalIncome={totalIncome} totalExpenses={totalExpenses} month={currentMonth} />

      <FinancialChart data={chartData} month={currentMonth} />

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Your Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardItems.map(item => (
            <DashboardCard key={item.to} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;