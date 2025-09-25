import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DollarSign, BarChart2, ArrowRightLeft, User } from 'lucide-react';
import { MonthlySummary } from "@/components/dashboard/MonthlySummary";
import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "../contexts/ProfileContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ChartData {
  day: string;
  income: number;
  expenses: number;
}

interface BudgetSummary {
  budgetedIncome: number;
  budgetedExpenses: number;
}

const Dashboard = () => {
  const { profile, loading: profileLoading } = useProfile();
  const [financials, setFinancials] = useState<{ totalIncome: number; totalExpenses: number; chartData: ChartData[] } | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
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
          console.error(err);
        } finally {
          setLoadingFinancials(false);
        }
      };
      fetchDashboardData();
    } else if (!profileLoading) {
      setLoadingFinancials(false);
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    if (profile) {
      const fetchBudgets = async () => {
        setLoadingBudgets(true);
        try {
          // Fetch income category IDs
          const { data: incomeCatIds, error: incomeCatError } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', profile.id)
            .eq('type', 'income');

          if (incomeCatError) {
            console.error('Error fetching income categories:', incomeCatError);
            setBudgetSummary({ budgetedIncome: 0, budgetedExpenses: 0 });
            setLoadingBudgets(false);
            return;
          }

          const incomeIds = incomeCatIds?.map(cat => cat.id) || [];

          // Sum budgeted income
          let budgetedIncome = 0;
          if (incomeIds.length > 0) {
            const { data: incomeBudgets, error: incomeBudgetError } = await supabase
              .from('budgets')
              .select('budgeted_amount')
              .eq('user_id', profile.id)
              .eq('year', currentYear)
              .eq('month', currentMonthNum)
              .in('category_id', incomeIds);
            
            if (incomeBudgetError) {
              console.error('Error fetching income budgets:', incomeBudgetError);
            } else {
              budgetedIncome = incomeBudgets?.reduce((sum, b) => sum + (b.budgeted_amount || 0), 0) || 0;
            }
          }

          // Fetch expense category IDs
          const { data: expenseCatIds, error: expenseCatError } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', profile.id)
            .eq('type', 'expense');

          if (expenseCatError) {
            console.error('Error fetching expense categories:', expenseCatError);
            setBudgetSummary({ budgetedIncome, budgetedExpenses: 0 });
            setLoadingBudgets(false);
            return;
          }

          const expenseIds = expenseCatIds?.map(cat => cat.id) || [];

          // Sum budgeted expenses
          let budgetedExpenses = 0;
          if (expenseIds.length > 0) {
            const { data: expenseBudgets, error: expenseBudgetError } = await supabase
              .from('budgets')
              .select('budgeted_amount')
              .eq('user_id', profile.id)
              .eq('year', currentYear)
              .eq('month', currentMonthNum)
              .in('category_id', expenseIds);
            
            if (expenseBudgetError) {
              console.error('Error fetching expense budgets:', expenseBudgetError);
            } else {
              budgetedExpenses = expenseBudgets?.reduce((sum, b) => sum + (b.budgeted_amount || 0), 0) || 0;
            }
          }

          setBudgetSummary({ budgetedIncome, budgetedExpenses });
        } catch (err: any) {
          console.error('Failed to load budgets:', err);
          // Gracefully set to 0 on any error, let UI prompt user to set budgets
          setBudgetSummary({ budgetedIncome: 0, budgetedExpenses: 0 });
        } finally {
          setLoadingBudgets(false);
        }
      };
      fetchBudgets();
    } else {
      setBudgetSummary({ budgetedIncome: 0, budgetedExpenses: 0 });
      setLoadingBudgets(false);
    }
  }, [profile, currentYear, currentMonthNum]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (profileLoading || loadingFinancials || loadingBudgets) {
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
    { to: '/exchange-rates', icon: <ArrowRightLeft className="h-6 w-6" />, title: 'Exchange Rates', description: 'Check currency conversions and rates.' },
    { to: '/profile', icon: <User className="h-6 w-6" />, title: 'Profile', description: 'Manage your account and personal settings.' }
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
      
      {financials && budgetSummary && (
        <MonthlySummary 
          totalIncome={actualIncome} 
          totalExpenses={actualExpenses} 
          budgetedIncome={budgetSummary.budgetedIncome}
          budgetedExpenses={budgetSummary.budgetedExpenses}
          month={currentMonth} 
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