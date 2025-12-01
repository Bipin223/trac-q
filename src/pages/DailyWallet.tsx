import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wallet, TrendingDown, TrendingUp, AlertCircle, PlusCircle, Calendar, DollarSign, Eye, EyeOff, Trash2, Edit } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { format, startOfDay, endOfDay, subDays, isToday } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyBudget {
  id: string;
  user_id: string;
  daily_limit: number;
  created_at: string;
  updated_at: string;
}

interface DailyExpense {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  expense_date: string;
  created_at: string;
}

interface DailySummary {
  date: string;
  budget: number;
  spent: number;
  remaining: number;
  expenses: DailyExpense[];
}

export default function DailyWallet() {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [dailyBudget, setDailyBudget] = useState<DailyBudget | null>(null);
  const [todayExpenses, setTodayExpenses] = useState<DailyExpense[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySummaries, setHistorySummaries] = useState<DailySummary[]>([]);
  
  // Form states
  const [budgetAmount, setBudgetAmount] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');

  const categories = [
    'Food & Drinks',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Others'
  ];

  const fetchDailyBudget = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('daily_budgets')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching daily budget:', error);
      } else if (data) {
        setDailyBudget(data);
        setBudgetAmount(data.daily_limit.toString());
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [profile]);

  const fetchDailyExpenses = useCallback(async (date: Date = new Date()) => {
    if (!profile) return;

    try {
      const startDate = startOfDay(date).toISOString();
      const endDate = endOfDay(date).toISOString();

      const { data, error } = await supabase
        .from('daily_expenses')
        .select('*')
        .eq('user_id', profile.id)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching daily expenses:', error);
      } else {
        if (isToday(date)) {
          setTodayExpenses(data || []);
        }
        return data || [];
      }
    } catch (error) {
      console.error('Error:', error);
    }
    return [];
  }, [profile]);

  const fetchHistory = useCallback(async () => {
    if (!profile || !dailyBudget) return;

    const summaries: DailySummary[] = [];
    for (let i = 0; i < 7; i++) {
      const date = subDays(new Date(), i);
      const expenses = await fetchDailyExpenses(date);
      const spent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      summaries.push({
        date: format(date, 'yyyy-MM-dd'),
        budget: dailyBudget.daily_limit,
        spent,
        remaining: dailyBudget.daily_limit - spent,
        expenses,
      });
    }

    setHistorySummaries(summaries);
  }, [profile, dailyBudget, fetchDailyExpenses]);

  useEffect(() => {
    if (profile) {
      const loadData = async () => {
        setLoading(true);
        await fetchDailyBudget();
        await fetchDailyExpenses();
        setLoading(false);
      };
      loadData();
    }
  }, [profile, fetchDailyBudget, fetchDailyExpenses]);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory, fetchHistory]);

  const handleSaveBudget = async () => {
    if (!profile || !budgetAmount) return;

    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid budget amount');
      return;
    }

    try {
      if (dailyBudget) {
        const { error } = await supabase
          .from('daily_budgets')
          .update({ daily_limit: amount, updated_at: new Date().toISOString() })
          .eq('id', dailyBudget.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_budgets')
          .insert({ user_id: profile.id, daily_limit: amount });

        if (error) throw error;
      }

      showSuccess('Daily budget saved successfully!');
      setShowBudgetDialog(false);
      await fetchDailyBudget();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      showError(error.message || 'Failed to save budget');
    }
  };

  const handleAddExpense = async () => {
    if (!profile || !expenseAmount || !expenseDescription || !expenseCategory) {
      showError('Please fill in all fields');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_expenses')
        .insert({
          user_id: profile.id,
          amount,
          description: expenseDescription,
          category: expenseCategory,
          expense_date: new Date().toISOString(),
        });

      if (error) throw error;

      showSuccess('Expense added successfully!');
      setShowExpenseDialog(false);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('');
      await fetchDailyExpenses();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      showError(error.message || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('daily_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showSuccess('Expense deleted successfully!');
      await fetchDailyExpenses();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      showError(error.message || 'Failed to delete expense');
    }
  };

  const totalSpent = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = (dailyBudget?.daily_limit || 0) - totalSpent;
  const percentageUsed = dailyBudget?.daily_limit 
    ? (totalSpent / dailyBudget.daily_limit) * 100 
    : 0;

  const getStatusColor = () => {
    if (percentageUsed >= 100) return 'text-red-600';
    if (percentageUsed >= 80) return 'text-orange-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (percentageUsed >= 100) return 'bg-red-600';
    if (percentageUsed >= 80) return 'bg-orange-600';
    return 'bg-green-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Wallet</h1>
          <p className="text-muted-foreground">Track your daily spending and stay within budget</p>
        </div>
        <Button onClick={() => setShowHistory(!showHistory)} variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          {showHistory ? 'Hide History' : 'View History'}
        </Button>
      </div>

      {/* Budget Not Set Alert */}
      {!dailyBudget && (
        <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-300">Set Your Daily Budget</AlertTitle>
          <AlertDescription className="text-yellow-600 dark:text-yellow-400">
            You haven't set a daily budget yet. Set one to start tracking your daily expenses.
            <Button onClick={() => setShowBudgetDialog(true)} className="ml-4" size="sm">
              Set Budget
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Today's Summary */}
      {dailyBudget && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">NPR {dailyBudget.daily_limit.toLocaleString()}</div>
                <Button variant="ghost" size="icon" onClick={() => setShowBudgetDialog(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">NPR {totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{todayExpenses.length} transactions</p>
            </CardContent>
          </Card>

          <Card className={`border-2 ${remaining >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getStatusColor()}`}>
                NPR {remaining.toLocaleString()}
              </div>
              <Progress value={Math.min(percentageUsed, 100)} className="mt-2 h-2" indicatorClassName={getProgressColor()} />
              <p className="text-xs text-muted-foreground mt-1">{percentageUsed.toFixed(1)}% used</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Over Budget Warning */}
      {dailyBudget && remaining < 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Over Budget!</AlertTitle>
          <AlertDescription>
            You've exceeded your daily budget by NPR {Math.abs(remaining).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogTrigger asChild>
            <Button className="flex-1">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Daily Expense</DialogTitle>
              <DialogDescription>Track your spending for today</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (NPR)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What did you spend on?"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
              <Button onClick={handleAddExpense}>Add Expense</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!dailyBudget && (
          <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Wallet className="h-4 w-4 mr-2" />
                Set Daily Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{dailyBudget ? 'Update' : 'Set'} Daily Budget</DialogTitle>
                <DialogDescription>Set your daily spending limit</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Daily Budget (NPR)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="0.00"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the maximum amount you want to spend each day
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBudgetDialog(false)}>Cancel</Button>
                <Button onClick={handleSaveBudget}>Save Budget</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Today's Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Expenses</CardTitle>
          <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          {todayExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No expenses recorded today</p>
              <p className="text-sm">Start tracking by adding your first expense</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
                  <div className="flex-1">
                    <p className="font-medium">{expense.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(expense.created_at), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-red-600">NPR {expense.amount.toLocaleString()}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>7-Day History</CardTitle>
            <CardDescription>Your daily spending over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historySummaries.map((summary) => (
                <div key={summary.date} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">{format(new Date(summary.date), 'EEEE, MMM d')}</p>
                      <p className="text-sm text-muted-foreground">{summary.expenses.length} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Budget: NPR {summary.budget.toLocaleString()}</p>
                      <p className="font-semibold text-red-600">Spent: NPR {summary.spent.toLocaleString()}</p>
                      <p className={`text-sm font-medium ${summary.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.remaining >= 0 ? 'Saved' : 'Over'}: NPR {Math.abs(summary.remaining).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min((summary.spent / summary.budget) * 100, 100)} 
                    className="h-2"
                    indicatorClassName={summary.remaining >= 0 ? 'bg-green-600' : 'bg-red-600'}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
