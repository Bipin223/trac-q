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
import { showError, showSuccess } from "@/utils/toast";

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

          const dailyData: ChartData[] = Array.from({ length: daysInMonth }, (_, i) => ({ day: (i + 1).toString().padStart(2, '0'), income: 0, expenses: 0 }));
          incomes?.forEach(i => { 
            const date = new Date(i.income_date).getDate();
            if(dailyData[date - 1]) dailyData[date - 1].income += i.amount; 
          });
          expenses?.forEach(e => { 
            const date = new Date(e.expense_date).getDate();
            if(dailyData[date - 1]) dailyData[date - 1].expenses += e.amount; 
          });

          setFinancials({ totalIncome, totalExpenses, chartData: dailyData });
        } catch (err: any) {
          setError("Failed to load financial data. Please try again later.");
          console.error('Dashboard fetch error:', err);
          showError(`Data load failed: ${err.message}`);
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

  // Fetch the single overall expense budget (TOTAL_EXPENSE) for this month (persistent in Supabase)
  const fetchExpenseBudget = useCallback(async () => {
    if (!profile) {
      setBudgetedExpenses(0);
      return;
    }
    try {
      console.log(`Fetching overall budget for user ${profile.id}, year ${currentYear}, month ${currentMonthNum}`);
      const totalExpenseCategoryId = await getTotalExpenseCategoryId(profile.id);
      const { data: budgetData, error } = await supabase
        .from('budgets')
        .select('budgeted_amount')
        .eq('user_id', profile.id)
        .eq('category_id', totalExpenseCategoryId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is fine (budget=0)
        console.error('Budget fetch error:', error);
        showError(`Failed to load budget: ${error.message}. Check console for details.`);
        setBudgetedExpenses(0);
        return;
      }

      const overallBudget = budgetData?.budgeted_amount || 0;
      setBudgetedExpenses(overallBudget);
      console.log('Fetched overall budget from Supabase:', overallBudget, 'using category ID:', totalExpenseCategoryId);
    } catch (err: any) {
      console.error('Unexpected budget fetch error:', err);
      showError(`Budget load failed: ${err.message}`);
      setBudgetedExpenses(0);
    }
  }, [profile, currentYear, currentMonthNum]);

  // Helper to get TOTAL_EXPENSE category ID (create if missing)
  const getTotalExpenseCategoryId = async (userId: string): Promise<string> => {
    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'TOTAL_EXPENSE')
      .eq('type', 'expense')
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking TOTAL_EXPENSE category:', existingError);
      throw existingError;
    }

    if (!existing) {
      const { data: inserted, error: insertError } = await supabase
        .from('categories')
        .insert({ name: 'TOTAL_EXPENSE', user_id: userId, type: 'expense' })
        .select('id')
        .single();
      if (insertError) {
        console.error('Failed to create TOTAL_EXPENSE category:', insertError);
        throw insertError;
      }
      return inserted.id;
    }
    return existing.id;
  };

  // Callback for after inline save: Refetch from DB to confirm persistence and update tile (now handles verified amount)
  const handleBudgetUpdate = useCallback(async (newExpenses: number | null) => {
    console.log('Form callback: Updating tile with', newExpenses, '- Refetching from Supabase to confirm');
    if (newExpenses !== null) {
      setBudgetedExpenses(newExpenses); // Immediate local update for instant tile response
    }
    await fetchExpenseBudget(); // Full refetch to sync with DB (ensures persistence)
    if (newExpenses !== null) {
      showSuccess(`Overall budget of ${formatCurrency(newExpenses)} set for ${currentMonth}! Tile synced (persists across logouts/logins).`);
    }
  }, [fetchExpenseBudget, currentMonth]);

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
        <AlertDescription>{error || "Could not load dashboard data. Your user profile might be missing or data could not be fetched."}</AlertDescription>
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
        <p className="text-muted-foreground">Here's your financial summary for {currentMonth}. The overall budget is saved to Supabase and updates the tile below.</p>
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
          onBudgetUpdate={handleBudgetUpdate}
        />
      )}
      {financials && <FinancialChart data={financials.chartData} month={currentMonth} />}

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