import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Bell, UserPlus, ArrowRightLeft, Calculator, Repeat, Clock, AlertTriangle, ReceiptText, Landmark, Wallet, ArrowUpRight, ArrowDownLeft, Handshake, TrendingUp, BarChart2 } from 'lucide-react';
import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "../contexts/ProfileContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecurringNotifications } from "@/components/RecurringNotifications";
import { useNotifications } from "@/contexts/NotificationContext";

interface ChartData {
  day: string;
  dayNum: number;  // Added for X-axis domain control in FinancialChart
  income: number;
  expenses: number;
  cumulativeIncome: number;
  cumulativeExpenses: number;
}

const formatCurrency = (amount: number) => {
  return "रु " + amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading: profileLoading } = useProfile();
  const { refreshNotifications } = useNotifications();
  const [financials, setFinancials] = useState<{ totalIncome: number; totalExpenses: number; chartData: ChartData[] } | null>(null);
  const [budgetedExpenses, setBudgetedExpenses] = useState(0);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTransactionsCount, setPendingTransactionsCount] = useState(0);
  const [pendingFriendRequestsCount, setPendingFriendRequestsCount] = useState(0);
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
  const [upcomingRecurring, setUpcomingRecurring] = useState<any[]>([]);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;

  const fetchDashboardData = useCallback(async () => {
    if (!profile) return;

    setLoadingFinancials(true);
    setError(null);
    try {
      console.log('Dashboard: Fetching data for user', profile.id);
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      // Format dates as YYYY-MM-DD strings to match the DATE column format in database
      const firstDayStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
      const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`;

      console.log('Dashboard: Date range:', firstDayStr, 'to', nextMonthStr);

      const { data: incomes, error: incomeError } = await supabase
        .from('incomes')
        .select('amount, income_date')
        .eq('user_id', profile.id)
        .gte('income_date', firstDayStr)
        .lt('income_date', nextMonthStr);

      console.log('Dashboard: Incomes fetched:', incomes?.length || 0, 'records', incomes);
      if (incomeError) {
        console.error('Dashboard: Income fetch error:', incomeError);
        throw incomeError;
      }

      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('user_id', profile.id)
        .gte('expense_date', firstDayStr)
        .lt('expense_date', nextMonthStr);

      console.log('Dashboard: Expenses fetched:', expenses?.length || 0, 'records', expenses);
      if (expenseError) {
        console.error('Dashboard: Expense fetch error:', expenseError);
        throw expenseError;
      }

      const totalIncome = incomes?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const totalExpenses = expenses?.reduce((sum, item) => sum + item.amount, 0) || 0;

      const dailyData: ChartData[] = Array.from({ length: daysInMonth }, (_, i) => ({
        day: (i + 1).toString().padStart(2, '0'),
        dayNum: i + 1,
        income: 0,
        expenses: 0,
        cumulativeIncome: 0,
        cumulativeExpenses: 0
      }));

      incomes?.forEach(i => {
        const date = new Date(i.income_date).getDate();
        if (dailyData[date - 1]) dailyData[date - 1].income += i.amount;
      });
      expenses?.forEach(e => {
        const date = new Date(e.expense_date).getDate();
        if (dailyData[date - 1]) dailyData[date - 1].expenses += e.amount;
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
  }, [profile]);

  // Simplified: Fetch overall budget directly (category_id IS NULL for overall; no category needed)
  const fetchExpenseBudget = useCallback(async () => {
    if (!profile) {
      console.log('Dashboard: No profile, setting budget to 0');
      setBudgetedExpenses(0);
      return;
    }
    try {
      console.log('Dashboard: Fetching overall budget for', profile.id, currentYear, currentMonthNum);

      // Query without maybeSingle to see all matching rows
      const { data: budgetData, error } = await supabase
        .from('budgets')
        .select('budgeted_amount, category_id')
        .eq('user_id', profile.id)
        .eq('year', currentYear)
        .eq('month', currentMonthNum);

      if (error) {
        console.error('Dashboard: Budget fetch error:', error);
        setBudgetedExpenses(0);
      } else if (budgetData && budgetData.length > 0) {
        // Find the overall budget (where category_id is null)
        const overallBudget = budgetData.find(b => b.category_id === null);
        const amount = overallBudget?.budgeted_amount || 0;
        console.log('Dashboard: Overall budget fetched:', amount, 'from', budgetData.length, 'budgets');
        setBudgetedExpenses(amount);
      } else {
        console.log('Dashboard: No budget found');
        setBudgetedExpenses(0);
      }
    } catch (err: any) {
      console.error('Dashboard: Budget fetch exception:', err);
      setBudgetedExpenses(0);
    }
  }, [profile, currentYear, currentMonthNum]);

  // Fetch recurring transactions
  const fetchRecurringTransactions = useCallback(async () => {
    if (!profile) return;

    try {
      const today = new Date();
      const fiveDaysLater = new Date(today);
      fiveDaysLater.setDate(today.getDate() + 5);

      // Fetch recurring expenses
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*, category:categories(name)')
        .eq('user_id', profile.id)
        .eq('is_recurring', true)
        .order('expense_date', { ascending: true });

      if (!expError && expenses) {
        setRecurringExpenses(expenses);

        // Filter upcoming (within 5 days)
        const upcoming = expenses.filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate >= today && expDate <= fiveDaysLater;
        }).slice(0, 3); // Limit to 3 items

        setUpcomingRecurring(upcoming);
      }
    } catch (err) {
      console.error('Dashboard: Error fetching recurring transactions:', err);
    }
  }, [profile]);

  // Fetch account balance and recent transactions
  const fetchAccountData = useCallback(async () => {
    if (!profile) return;

    try {
      // Fetch account balance
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!accountError && account) {
        setAccountBalance(account.balance);
      }

      // Fetch recent transactions
      const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!txnError && transactions) {
        setRecentTransactions(transactions);
      }
    } catch (err) {
      console.error('Dashboard: Error fetching account data:', err);
    }
  }, [profile]);

  // Fetch notifications for pending transactions and friend requests
  const fetchNotifications = useCallback(async () => {
    if (!profile) return;

    try {
      // Fetch pending transactions where current user is receiver
      const { data: pendingTxns, error: txnError } = await supabase
        .from('pending_transactions')
        .select('id')
        .eq('to_user_id', profile.id)
        .in('status', ['pending', 'pending_receiver']);

      if (!txnError && pendingTxns) {
        setPendingTransactionsCount(pendingTxns.length);
      }

      // Fetch pending friend requests where current user is the recipient
      const { data: friendReqs, error: friendError } = await supabase
        .from('friends')
        .select('id')
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      if (!friendError && friendReqs) {
        setPendingFriendRequestsCount(friendReqs.length);
      }
    } catch (err) {
      console.error('Dashboard: Error fetching notifications:', err);
    }
  }, [profile]);

  // Real-time subscriptions for dashboard data
  useEffect(() => {
    if (profile && !profileLoading) {
      // Set up real-time subscription for incomes
      const incomesSubscription = supabase
        .channel(`dashboard_incomes_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'incomes',
            filter: `user_id=eq.${profile.id}`,
          },
          () => {
            fetchDashboardData();
            refreshNotifications();
          }
        )
        .subscribe();

      // Set up real-time subscription for expenses
      const expensesSubscription = supabase
        .channel(`dashboard_expenses_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
            filter: `user_id=eq.${profile.id}`,
          },
          () => {
            fetchDashboardData();
            refreshNotifications();
          }
        )
        .subscribe();

      // Set up real-time subscription for budgets
      const budgetsSubscription = supabase
        .channel(`dashboard_budgets_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'budgets',
            filter: `user_id=eq.${profile.id}`,
          },
          () => {
            fetchExpenseBudget();
          }
        )
        .subscribe();

      // Set up real-time subscription for accounts
      const accountsSubscription = supabase
        .channel(`dashboard_accounts_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
            filter: `user_id=eq.${profile.id}`,
          },
          () => {
            fetchAccountData();
          }
        )
        .subscribe();

      // Set up real-time subscription for transactions
      const transactionsSubscription = supabase
        .channel(`dashboard_transactions_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${profile.id}`,
          },
          () => {
            fetchAccountData();
          }
        )
        .subscribe();

      return () => {
        incomesSubscription.unsubscribe();
        expensesSubscription.unsubscribe();
        budgetsSubscription.unsubscribe();
        accountsSubscription.unsubscribe();
        transactionsSubscription.unsubscribe();
      };
    }
  }, [profile, profileLoading, fetchDashboardData, fetchExpenseBudget, refreshNotifications]);

  useEffect(() => {
    if (profile && !profileLoading) {
      console.log('Dashboard: Fetching data for user', profile.id);
      fetchDashboardData();
      fetchExpenseBudget();
      fetchRecurringTransactions();
      fetchNotifications();
      fetchAccountData();
    } else if (!profileLoading) {
      setLoadingFinancials(false);
      setBudgetedExpenses(0);
    }
  }, [profile, profileLoading, location.pathname, fetchDashboardData, fetchExpenseBudget, fetchRecurringTransactions, fetchNotifications, fetchAccountData]);

  // Callback for after budget save: Save to database and update UI
  const handleBudgetUpdate = useCallback(async (newExpenses: number) => {
    if (!profile || newExpenses < 0) return;

    try {
      console.log('Dashboard: Saving budget:', newExpenses);

      // Check if overall budget already exists (category_id = null)
      const { data: existingBudgets } = await supabase
        .from('budgets')
        .select('id, category_id')
        .eq('user_id', profile.id)
        .eq('year', currentYear)
        .eq('month', currentMonthNum);

      const overallBudget = existingBudgets?.find(b => b.category_id === null);
      let error;

      if (overallBudget) {
        // Update existing overall budget
        console.log('Dashboard: Updating existing budget ID:', overallBudget.id);
        const result = await supabase
          .from('budgets')
          .update({ budgeted_amount: newExpenses })
          .eq('id', overallBudget.id);
        error = result.error;
      } else {
        // Insert new overall budget
        console.log('Dashboard: Inserting new budget');
        const result = await supabase
          .from('budgets')
          .insert({
            user_id: profile.id,
            category_id: null,
            year: currentYear,
            month: currentMonthNum,
            budgeted_amount: newExpenses,
          });
        error = result.error;
      }

      if (error) {
        console.error('Dashboard: Budget save error:', error);
        showError('Failed to save budget.');
      } else {
        console.log('Dashboard: Budget saved successfully');
        // Update UI immediately
        setBudgetedExpenses(newExpenses);
        showSuccess(`Budget updated to रु  ${newExpenses.toLocaleString()}`);
      }
    } catch (err: any) {
      console.error('Dashboard: Budget save exception:', err);
      showError('Could not save budget.');
    }
  }, [profile, currentYear, currentMonthNum]);

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
    { to: '/dashboard/accounts', icon: <Landmark className="h-6 w-6" />, title: 'Accounts', description: 'Monitor your account balances.' },
    { to: '/dashboard/incomes', icon: <ArrowDownLeft className="h-6 w-6" />, title: 'Incomes', description: 'Track your incoming money.' },
    { to: '/dashboard/expenses', icon: <ArrowUpRight className="h-6 w-6" />, title: 'Expenses', description: 'Monitor your spending habits.' },
    { to: '/dashboard/daily-wallet', icon: <Wallet className="h-6 w-6" />, title: 'Daily Wallet', description: 'Manage your daily budget.' },
    { to: '/dashboard/lend-borrow', icon: <Handshake className="h-6 w-6" />, title: 'Lend & Borrow', description: 'Track money you owe or are owed.' },
    { to: '/dashboard/friends', icon: <UserPlus className="h-6 w-6" />, title: 'Friends', description: 'Connect and split bills with others.' },
    { to: '/dashboard/money-requests', icon: <ArrowRightLeft className="h-6 w-6" />, title: 'Money Requests', description: 'Send or receive money requests.' },
    { to: '/dashboard/split-bills', icon: <ReceiptText className="h-6 w-6" />, title: 'Split Bills', description: 'Split expenses equally with friends.' },
    { to: '/dashboard/loan-calculator', icon: <Calculator className="h-6 w-6" />, title: 'Loan Calculator', description: 'Calculate loan EMIs and interest.' },
    { to: '/dashboard/savings-investment', icon: <TrendingUp className="h-6 w-6" />, title: 'Savings & Investment', description: 'Plan your financial future.' },
    { to: '/dashboard/recurring', icon: <Repeat className="h-6 w-6" />, title: 'Recurring', description: 'Manage your recurring transactions.' },
    { to: '/dashboard/comparison', icon: <BarChart2 className="h-6 w-6" />, title: 'Comparison', description: 'Compare your finances over time.' }
  ];

  const actualIncome = financials?.totalIncome || 0;
  const actualExpenses = financials?.totalExpenses || 0;
  const netSavings = actualIncome - actualExpenses;

  const savingsRate = actualIncome > 0 ? ((netSavings / actualIncome) * 100).toFixed(1) : 0;
  const budgetUtilization = budgetedExpenses > 0 ? ((actualExpenses / budgetedExpenses) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Recurring Notifications System */}
      <RecurringNotifications onNotificationUpdate={() => {
        fetchRecurringTransactions();
        fetchNotifications();
        refreshNotifications();
      }} />

      {/* Notification Banner */}
      {(pendingTransactionsCount > 0 || pendingFriendRequestsCount > 0) && (
        <Alert className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
          <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
            You have pending notifications!
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 mt-2">
            <div className="flex flex-wrap gap-3">
              {pendingTransactionsCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard/pending-transactions')}
                  className="bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-amber-300 dark:border-amber-700"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  {pendingTransactionsCount} Pending Transaction{pendingTransactionsCount > 1 ? 's' : ''}
                  <Badge className="ml-2 bg-amber-500 text-white">{pendingTransactionsCount}</Badge>
                </Button>
              )}
              {pendingFriendRequestsCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard/friends')}
                  className="bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-amber-300 dark:border-amber-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {pendingFriendRequestsCount} Friend Request{pendingFriendRequestsCount > 1 ? 's' : ''}
                  <Badge className="ml-2 bg-amber-500 text-white">{pendingFriendRequestsCount}</Badge>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

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
              Current budget: रु  {budgetedExpenses.toLocaleString()}
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

      {/* Account Balance Card */}
      {accountBalance !== null && (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <Wallet className="h-5 w-5" />
                  Account Balance
                </CardTitle>
                <CardDescription>Your virtual wallet</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/accounts')}
                className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
              >
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mb-4">
              रु  {accountBalance.toLocaleString()}
            </div>
            {recentTransactions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">Recent Transactions</p>
                {recentTransactions.slice(0, 3).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between text-sm p-2 rounded bg-white/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      {txn.transaction_type === 'credit' ? (
                        <ArrowDownLeft className="h-3 w-3 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 text-red-600" />
                      )}
                      <span className="text-xs truncate max-w-[120px]">{txn.description || txn.category}</span>
                    </div>
                    <span className={`font-semibold text-xs ${txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.transaction_type === 'credit' ? '+' : '-'}रु  {txn.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-3">रु  {actualIncome.toLocaleString()}</p>
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
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1">रु  {budgetedExpenses.toLocaleString()}</p>
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
          <p className="text-2xl font-bold text-red-700 dark:text-red-300 mb-1">रु  {actualExpenses.toLocaleString()}</p>
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
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mb-3">रु  {netSavings.toLocaleString()}</p>
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

      {/* Recurring Expenses Overview */}
      {recurringExpenses.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-purple-600" />
                  Recurring Expenses Overview
                </CardTitle>
                <CardDescription>Your recurring financial commitments</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/recurring')}
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-muted-foreground mb-1">Monthly Recurring</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(recurringExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{recurringExpenses.length} items</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-muted-foreground mb-1">Upcoming (5 days)</p>
                <p className="text-2xl font-bold text-orange-600">
                  {upcomingRecurring.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Transactions due soon</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground mb-1">Budget Impact</p>
                <p className="text-2xl font-bold text-blue-600">
                  {budgetedExpenses > 0
                    ? `${((recurringExpenses.reduce((sum, exp) => sum + exp.amount, 0) / budgetedExpenses) * 100).toFixed(0)}%`
                    : 'N/A'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">Of monthly budget</p>
              </div>
            </div>

            {upcomingRecurring.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="font-semibold text-sm">Upcoming This Week</h3>
                </div>
                {upcomingRecurring.map((transaction) => {
                  const daysUntil = Math.ceil((new Date(transaction.expense_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-sm">{transaction.description || transaction.category?.name}</p>
                          <p className="text-xs text-muted-foreground">{transaction.category?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">{formatCurrency(transaction.amount)}</p>
                        <Badge variant="outline" className="text-xs border-amber-600 text-amber-600">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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