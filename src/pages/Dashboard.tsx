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
  dayNum: number;  // Added for X-axis domain control in FinancialChart
  income: number;
  expenses: number;
  cumulativeIncome: number;
  cumulativeExpenses: number;
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
            dayNum: i + 1,  // Added for type consistency with FinancialChart
            income: 0, 
            expenses: 0,
            cumulativeIncome: 0,
            cumulativeExpenses: 0
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
    { to: '/dashboard/incomes', icon: <DollarSign className="h-6 w-6" />, title: 'Incomes', description: 'Log your earnings and manage income sources.' },
    { to: '/dashboard/expenses', icon: <BarChart2 className="h-6 w-6" />, title: 'Expenses', description: 'Record your spending and analyze your habits.' },
    { to: '/dashboard/exchange-rates', icon: <ArrowRightLeft className="h-6 w-6" />, title: 'Exchange Rates', description: 'Check currency conversions and rates.' }
  ];

  const actualIncome = financials?.totalIncome || 0;
  const actualExpenses = financials?.totalExpenses || 0;
  const netSavings = actualIncome - actualExpenses;

  const savingsRate = actualIncome > 0 ? ((netSavings / actualIncome) * 100).toFixed(1) : 0;
  const budgetUtilization = budgetedExpenses > 0 ? ((actualExpenses / budgetedExpenses) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{getGreeting()}, {profile.role === "admin" ? `Admin - ${displayName}` : displayName}!</h1>
        <p className="text-muted-foreground">Here's your financial summary for {currentMonth}.</p>
      </div>

      {/* Budget Update Section - Minimalistic */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-1">
              Update Monthly Budget for {currentMonth}
            </h3>
            <p className="text-sm text-muted-foreground">
              Current budget: NPR {budgetedExpenses.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="number"
              placeholder="Enter budget amount"
              className="px-4 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full md:w-64"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  const value = parseFloat(input.value);
                  if (value > 0) {
                    handleBudgetUpdate(value);
                    input.value = '';
                  }
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                const value = parseFloat(input.value);
                if (value > 0) {
                  handleBudgetUpdate(value);
                  input.value = '';
                }
              }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all hover:scale-105 hover:shadow-md whitespace-nowrap"
            >
              Update Budget
            </button>
          </div>
        </div>
      </div>
      
      {/* Financial Overview Cards with Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Actual Income Card */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Actual Income</p>
              <p className="text-xs text-muted-foreground">for {currentMonth}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-3">NPR {actualIncome.toLocaleString()}</p>
          <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Overall Budget Card */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Overall Budget for {currentMonth}</p>
              <p className="text-xs text-muted-foreground">Your monthly spending limit</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1">NPR {budgetedExpenses.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {budgetedExpenses > 0 ? `Under budget (${budgetUtilization}%)` : 'No budget set'}
          </p>
          <div className="w-full bg-purple-200 dark:bg-purple-900/40 rounded-full h-2">
            <div className="bg-gradient-to-r from-purple-500 to-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Actual Expenses Card */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Actual Expenses</p>
              <p className="text-xs text-muted-foreground">for {currentMonth}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300 mb-1">NPR {actualExpenses.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {budgetedExpenses > 0 ? `${budgetUtilization}% of budget` : 'No budget set'}
          </p>
          <div className="w-full bg-red-200 dark:bg-red-900/40 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${Number(budgetUtilization) > 100 ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-purple-500 to-green-500'}`}
              style={{ width: `${Math.min(Number(budgetUtilization), 100)}%` }}
            ></div>
          </div>
          {budgetedExpenses > 0 && (
            <p className="text-xs mt-1 text-muted-foreground">
              {Number(budgetUtilization) > 100 ? '⚠️ Over budget' : '✓ Under budget'}
            </p>
          )}
        </div>

        {/* Net Savings Card */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Net Savings</p>
              <p className="text-xs text-muted-foreground">Your balance for {currentMonth}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mb-3">NPR {netSavings.toLocaleString()}</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Savings rate</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{savingsRate}%</span>
          </div>
        </div>
      </div>

      {financials && (
        <FinancialChart 
          data={financials.chartData}  // Now compatible with dayNum
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