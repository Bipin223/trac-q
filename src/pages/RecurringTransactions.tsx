import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Repeat, Pause, Trash2, DollarSign, TrendingUp, TrendingDown, Info, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isBefore } from 'date-fns';

type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
type TransactionType = 'income' | 'expense';

interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  frequency: RecurrenceFrequency;
  customDay?: number;
  nextDate: Date;
  is_active: boolean;
  created_at: string;
  last_executed?: string;
}

export default function RecurringTransactions() {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringTransaction[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringTransaction[]>([]);
  const [showRecurringInfo, setShowRecurringInfo] = useState(false);
  const [isRecurringInfoDialogOpen, setIsRecurringInfoDialogOpen] = useState(false);

  const fetchRecurringTransactions = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const [incomesRes, expensesRes] = await Promise.all([
        supabase
          .from('incomes')
          .select('*, category:categories(name)')
          .eq('user_id', profile.id)
          .eq('is_recurring', true)
          .order('income_date', { ascending: true }),
        supabase
          .from('expenses')
          .select('*, category:categories(name)')
          .eq('user_id', profile.id)
          .eq('is_recurring', true)
          .order('expense_date', { ascending: true }),
      ]);

      const processedIncomes = (incomesRes.data || []).map(item => ({
        id: item.id,
        type: 'income' as TransactionType,
        amount: item.amount,
        description: item.description || '',
        category: item.category?.name || 'Uncategorized',
        frequency: 'monthly' as RecurrenceFrequency, // Default, can be enhanced
        nextDate: new Date(item.income_date),
        is_active: true,
        created_at: item.created_at,
      }));

      const processedExpenses = (expensesRes.data || []).map(item => ({
        id: item.id,
        type: 'expense' as TransactionType,
        amount: item.amount,
        description: item.description || '',
        category: item.category?.name || 'Uncategorized',
        frequency: 'monthly' as RecurrenceFrequency,
        nextDate: new Date(item.expense_date),
        is_active: true,
        created_at: item.created_at,
      }));

      setRecurringIncomes(processedIncomes);
      setRecurringExpenses(processedExpenses);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      showError('Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      fetchRecurringTransactions();
    }
  }, [profile, fetchRecurringTransactions]);

  const deleteRecurringTransaction = async (id: string, type: TransactionType) => {
    try {
      const { error } = await supabase
        .from(type === 'income' ? 'incomes' : 'expenses')
        .update({ is_recurring: false })
        .eq('id', id);

      if (error) throw error;

      showSuccess(`Recurring ${type} removed`);
      fetchRecurringTransactions();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      showError(`Failed to remove recurring ${type}`);
    }
  };

  const pauseRecurringTransaction = async (_id: string, type: TransactionType) => {
    showSuccess(`Recurring ${type} paused (feature in development)`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(amount);
  };

  const getNextOccurrence = (transaction: RecurringTransaction): string => {
    const today = new Date();
    const nextDate = transaction.nextDate;

    if (isBefore(nextDate, today)) {
      return 'Overdue';
    }

    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `In ${daysUntil} days`;
    if (daysUntil <= 30) return `In ${Math.ceil(daysUntil / 7)} weeks`;
    return format(nextDate, 'MMM d, yyyy');
  };

  const getFrequencyLabel = (frequency: RecurrenceFrequency): string => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
      custom: 'Custom',
    };
    return labels[frequency];
  };

  const totalMonthlyRecurringIncome = recurringIncomes.reduce((sum, t) => {
    // Simplified: assume all are monthly
    return sum + t.amount;
  }, 0);

  const totalMonthlyRecurringExpense = recurringExpenses.reduce((sum, t) => {
    return sum + t.amount;
  }, 0);

  const upcomingTransactions = [
    ...recurringIncomes.filter(t => t.is_active),
    ...recurringExpenses.filter(t => t.is_active),
  ].sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Transactions</h1>
          <p className="text-muted-foreground">Manage your recurring income and expenses</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Repeat className="h-3 w-3 mr-1" />
          {recurringIncomes.length + recurringExpenses.length} Active
        </Badge>
      </div>

      <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <AlertTitle className="text-purple-700 dark:text-purple-300 flex items-center justify-between">
          Recurring Transactions Guide
          <div className="flex items-center gap-2">
            <Dialog open={isRecurringInfoDialogOpen} onOpenChange={setIsRecurringInfoDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  Read More
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Managing Recurring Transactions</DialogTitle>
                  <DialogDescription>
                    Automate your regular income and expenses
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Recurrence Frequency Options</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Example Use Case</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell><strong>Daily</strong></TableCell>
                          <TableCell>Every day</TableCell>
                          <TableCell>Daily allowance, business revenue</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Weekly</strong></TableCell>
                          <TableCell>Every 7 days</TableCell>
                          <TableCell>Weekly grocery, part-time income</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Monthly</strong></TableCell>
                          <TableCell>Same day each month</TableCell>
                          <TableCell>Salary, rent, subscriptions</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Yearly</strong></TableCell>
                          <TableCell>Once per year</TableCell>
                          <TableCell>Insurance premium, annual fees</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Custom</strong></TableCell>
                          <TableCell>Specific day of month</TableCell>
                          <TableCell>Pension (25th), loan EMI (1st)</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Smart Management Features</h3>
                    <div className="space-y-2">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">🔔 Proactive Alerts</p>
                        <p className="text-xs text-muted-foreground">Get notified 5 days before recurring expenses are due</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">⏸️ Pause & Resume</p>
                        <p className="text-xs text-muted-foreground">Temporarily pause recurring items without deleting them</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">✏️ Flexible Editing</p>
                        <p className="text-xs text-muted-foreground">Adjust amount, frequency, or date anytime</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">📊 Budget Impact</p>
                        <p className="text-xs text-muted-foreground">See how recurring expenses affect your monthly budget</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Common Recurring Items in Nepal</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="font-semibold text-sm mb-2">Income</p>
                        <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                          <li>• Monthly salary (1st or end of month)</li>
                          <li>• Pension payments (25th)</li>
                          <li>• Rental income (monthly)</li>
                          <li>• Business revenue (daily/weekly)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-2">Expenses</p>
                        <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                          <li>• Rent (monthly - 1st/5th)</li>
                          <li>• Loan EMI (monthly)</li>
                          <li>• Utilities (electricity, water, internet)</li>
                          <li>• Subscriptions (Netflix, Spotify)</li>
                          <li>• Insurance premiums (yearly)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p><strong>Tip:</strong> Mark transactions as recurring when adding them to automate tracking and get smart reminders!</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecurringInfo(!showRecurringInfo)}
              className="h-auto p-0 text-purple-600 dark:text-purple-400"
            >
              {showRecurringInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="text-purple-600 dark:text-purple-400">
          {showRecurringInfo ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>Automate your regular financial commitments</p>
              <p className="text-xs">• Track monthly income: {formatCurrency(totalMonthlyRecurringIncome)}</p>
              <p className="text-xs">• Track monthly expenses: {formatCurrency(totalMonthlyRecurringExpense)}</p>
              <p className="text-xs">• Get notified 5 days before due dates</p>
            </div>
          ) : null}
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalMonthlyRecurringIncome)}</p>
                <p className="text-xs text-muted-foreground">{recurringIncomes.length} active</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalMonthlyRecurringExpense)}</p>
                <p className="text-xs text-muted-foreground">{recurringExpenses.length} active</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Monthly Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${(totalMonthlyRecurringIncome - totalMonthlyRecurringExpense) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(totalMonthlyRecurringIncome - totalMonthlyRecurringExpense)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((totalMonthlyRecurringExpense / (totalMonthlyRecurringIncome || 1)) * 100).toFixed(0)}% of income
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Recurring Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Recurring Items
          </CardTitle>
          <CardDescription>Next 5 recurring transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Repeat className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No upcoming recurring transactions</p>
              <p className="text-sm">Mark transactions as recurring to see them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTransactions.map((transaction) => {
                const isOverdue = isBefore(transaction.nextDate, new Date());
                return (
                  <div key={transaction.id} className={`flex items-center justify-between p-3 border rounded-lg ${isOverdue ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <div className="flex items-center gap-3">
                      {isOverdue && <AlertTriangle className="h-5 w-5 text-red-600" />}
                      <div>
                        <p className="font-medium">{transaction.description || transaction.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.category} • {getFrequencyLabel(transaction.frequency)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-xs">
                        {getNextOccurrence(transaction)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Transactions Tables */}
      {loading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <Tabs defaultValue="expenses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="expenses">
              Recurring Expenses ({recurringExpenses.length})
            </TabsTrigger>
            <TabsTrigger value="incomes">
              Recurring Incomes ({recurringIncomes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Recurring Expenses</CardTitle>
                <CardDescription>Manage your regular expense commitments</CardDescription>
              </CardHeader>
              <CardContent>
                {recurringExpenses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingDown className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No recurring expenses yet</p>
                    <p className="text-sm">Mark expenses as recurring when adding them</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringExpenses.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.description || '-'}</TableCell>
                          <TableCell>{transaction.category}</TableCell>
                          <TableCell className="text-red-600 font-semibold">{formatCurrency(transaction.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getFrequencyLabel(transaction.frequency)}</Badge>
                          </TableCell>
                          <TableCell>{format(transaction.nextDate, 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => pauseRecurringTransaction(transaction.id, transaction.type)}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove recurring expense?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will mark the expense as non-recurring. The existing transaction will remain in your history.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRecurringTransaction(transaction.id, transaction.type)}
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incomes">
            <Card>
              <CardHeader>
                <CardTitle>Recurring Incomes</CardTitle>
                <CardDescription>Manage your regular income sources</CardDescription>
              </CardHeader>
              <CardContent>
                {recurringIncomes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No recurring incomes yet</p>
                    <p className="text-sm">Mark incomes as recurring when adding them</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringIncomes.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.description || '-'}</TableCell>
                          <TableCell>{transaction.category}</TableCell>
                          <TableCell className="text-green-600 font-semibold">{formatCurrency(transaction.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getFrequencyLabel(transaction.frequency)}</Badge>
                          </TableCell>
                          <TableCell>{format(transaction.nextDate, 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => pauseRecurringTransaction(transaction.id, transaction.type)}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove recurring income?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will mark the income as non-recurring. The existing transaction will remain in your history.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRecurringTransaction(transaction.id, transaction.type)}
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
