import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DollarSign, BarChart2, ArrowRightLeft } from 'lucide-react';
import { MonthlySummary } from "@/components/dashboard/MonthlySummary";
import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "../contexts/ProfileContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { showError } from "@/utils/toast";

interface ChartData {
  day: string;
  income: number;
  expenses: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const [financials, setFinancials] = useState<{ totalIncome: number; totalExpenses: number; chartData: ChartData[] } | null>(null);
  const [budgetedExpenses, setBudgetedExpenses] = useState(0);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;

  useEffect(() => {
    if (profile) {
      const fetchDashboardData = async () => {
        setLoadingFinancials(true);
        setError(null);
        try {
          console.log('Dashboard: Fetching data for user', profile.id);
          const today = new Date();
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

          const { data: incomes, error: incomeError } = await supabase.from('incomes').select('amount, income_date').eq('user_id', profile.id).gte('income_date', firstDay).lte('income_date', lastDay);
          if (incomeError) throw incomeError;

          const { data: expenses, error: expenseError } = await supabase.from('expenses').select('amount, expense_date').eq('user_id', profile.id).gte('expense_date', firstDay).lte('expense_date', lastDay);
          if (expenseError) throw expenseError;

          const totalIncome = incomes?.reduce((sum, item) => sum + item.amount, 0) || 0;
          const totalExpenses = expenses?.reduce((sum, item) => sum + item.amount, 0) || 0;

          const dailyData: ChartData[] = Array.from({ length: daysInMonth }, (_, i) => ({ 
            day: (i + 1).toString().padStart(2, '0'), 
            income: 0, 
            expenses: 0
          }));
          
          incomes?.forEach(i => { 
            const date = new Date(i.income_date).getDate();
            if(dailyData[date - 1]) dailyData[date - 1].income += i.amount; 
          });
          expenses?.forEach(e => { 
            const date = new Date(e.expense_date).getDate();
            if(dailyData[date - 1]) dailyData[date - 1].expenses += e.amount; 
          });

          setFinancials({ totalIncome, totalExpenses, chartData: dailyData });
          console.log('Dashboard: Fetched financials - Income:', totalIncome, 'Expenses:', totalExpenses);
        } catch (err: any) {
          console.error('Dashboard: Fetch error:', err);
          setError("Could not load financial data. Please try again.");
          showError('Failed to load data.');
        } finally {
          setLoadingFinancials(false);
        }
      };
      fetchDashboardData();
      fetchExpenseBudget(); // Initial budget fetch
    } else if (!profileLoading) {
      setLoadingFinancials(false);
      setBudgetedExpenses(0);
    }
  }, [profile, profileLoading]);

  // Simplified: Fetch overall budget directly (category_id IS NULL for overall; no category needed)
  const fetchExpenseBudget = useCallback(async () => {
    if (!profile) {
      console.log('Dashboard: No profile, setting budget to 0');
      setBudgetedExpenses(0);
      return;
    }
    try {
      console.log('Dashboard: Fetching overall budget for', profile.id, currentYear, currentMonthNum);
      
      const { data: budgetData, error } = await supabase
        .from('budgets')
        .select('budgeted_amount')
        .eq('user_id', profile.id)
        .is('category_id', null)  // Overall budget: No specific category
        .eq('year', currentYear)
        .eq('month', currentMonthNum)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {  // No rows
          console.log('Dashboard: No overall budget row found (normal for first time)');
          setBudgetedExpenses(0);
        } else {
          console.error('Dashboard: Budget fetch error:', error);
          setBudgetedExpenses(0);
          showError('Failed to load budget.');
        }
      } else {
        const overallBudget = budgetData?.budgeted_amount || 0;
        console.log('Dashboard: Overall budget fetched:', overallBudget);
        setBudgetedExpenses(overallBudget);
      }
    } catch (err: any) {
      console.error('Dashboard: Budget fetch exception:', err);
      setBudgetedExpenses(0);
      showError('Could not load budget.');
    }
  }, [profile, currentYear, currentMonthNum]);

  // Callback for after budget save: Update state and re-fetch to confirm
  const handleBudgetUpdate = useCallback(async (newExpenses: number) => {
    console.log('Dashboard: Budget update callback:', newExpenses);
    if (newExpenses >= 0) {
      setBudgetedExpenses(newExpenses);
    }
    // Re-fetch to confirm persistence
    await fetchExpenseBudget();
  }, [fetchExpenseBudget]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (profileLoading || loadingFinancials) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-5 w-3/4" />
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!profile || error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || "Could not load dashboard data."}</AlertDescription>
      </Alert>
    );
  }

  const displayName = profile.username || "Valued User";
  const dashboardItems = [
    { to: '/incomes', icon: <DollarSign className="h-6 w-6" />, title: 'Incomes', description: 'Log your earnings and manage income sources.' },
    { to: '/expenses', icon: <BarChart2 className="h-6 w-6" />, title: 'Expenses', description: 'Record your spending and analyze your habits.' },
    { to: '/exchange-rates', icon: <ArrowRightLeft className="h-6 w-6" />, title: 'Exchange Rates', description: 'Check currency conversions and rates.' }
  ];

  const actualIncome = financials?.totalIncome || 0;
  const actualExpenses = financials?.totalExpenses || 0;
  const netSavings = actualIncome - actualExpenses;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{getGreeting()}, {profile.role === "admin" ? `Admin - ${displayName}` : displayName}!</h1>
        <p className="text-muted-foreground">Here's your financial summary for {currentMonth}.</p>
      </div>
      
      {financials && (
        <MonthlySummary 
          totalIncome={actualIncome} 
          totalExpenses={actualExpenses} 
          budgetedExpenses={budgetedExpenses}
          month={currentMonth}
          currentYear={currentYear}
          currentMonthNum={currentMonthNum}
          profile={profile}
          categoryIdForBudget={null}  // Pass null for overall budget (no category needed)
          onBudgetUpdate={handleBudgetUpdate}
        />
      )}
      {financials && (
        <FinancialChart 
          data={financials.chartData} 
          month={currentMonth} 
        />
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Your Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardItems.map(item => (<DashboardCard key={item.to} {...item} />))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;