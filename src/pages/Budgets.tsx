import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { DollarSign, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const Budgets = () => {
  const user = useUser();
  const { profile } = useProfile();
  const [budgetedIncome, setBudgetedIncome] = useState(0);
  const [budgetedExpenses, setBudgetedExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [totalIncomeCategoryId, setTotalIncomeCategoryId] = useState<string | null>(null);
  const [totalExpenseCategoryId, setTotalExpenseCategoryId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user || !profile) return;
    setLoading(true);

    // Create or find special total categories
    const specialCategories = [
      { name: 'TOTAL_INCOME', type: 'income' as const },
      { name: 'TOTAL_EXPENSE', type: 'expense' as const },
    ];

    for (const cat of specialCategories) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', profile.id)
        .eq('name', cat.name)
        .eq('type', cat.type)
        .single();

      if (!existing) {
        const { data: inserted, error } = await supabase
          .from('categories')
          .insert({ name: cat.name, user_id: profile.id, type: cat.type })
          .select('id')
          .single();

        if (error) {
          console.error(`Failed to create ${cat.name} category:`, error);
        } else if (inserted) {
          if (cat.name === 'TOTAL_INCOME') setTotalIncomeCategoryId(inserted.id);
          if (cat.name === 'TOTAL_EXPENSE') setTotalExpenseCategoryId(inserted.id);
        }
      } else {
        if (cat.name === 'TOTAL_INCOME') setTotalIncomeCategoryId(existing.id);
        if (cat.name === 'TOTAL_EXPENSE') setTotalExpenseCategoryId(existing.id);
      }
    }

    // Fetch existing total budgets
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    if (totalIncomeCategoryId) {
      const { data: incomeBudget } = await supabase
        .from('budgets')
        .select('budgeted_amount')
        .eq('user_id', profile.id)
        .eq('category_id', totalIncomeCategoryId)
        .eq('year', year)
        .eq('month', month)
        .single();

      setBudgetedIncome(incomeBudget?.budgeted_amount || 0);
    }

    if (totalExpenseCategoryId) {
      const { data: expenseBudget } = await supabase
        .from('budgets')
        .select('budgeted_amount')
        .eq('user_id', profile.id)
        .eq('category_id', totalExpenseCategoryId)
        .eq('year', year)
        .eq('month', month)
        .single();

      setBudgetedExpenses(expenseBudget?.budgeted_amount || 0);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, profile, currentMonth, totalIncomeCategoryId, totalExpenseCategoryId]);

  const handleIncomeChange = (value: string) => {
    setBudgetedIncome(parseFloat(value) || 0);
  };

  const handleExpenseChange = (value: string) => {
    setBudgetedExpenses(parseFloat(value) || 0);
  };

  const confirmSaveBudgets = () => {
    if (budgetedIncome === 0 && budgetedExpenses === 0) {
      showError('Set at least one budget amount.');
      return;
    }
    setShowSaveConfirm(true);
  };

  const saveBudgets = async () => {
    if (!user || !profile || !totalIncomeCategoryId || !totalExpenseCategoryId) return;
    setSaving(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    // Delete existing total budgets for this month
    await supabase
      .from('budgets')
      .delete()
      .eq('user_id', profile.id)
      .eq('category_id', totalIncomeCategoryId)
      .eq('year', year)
      .eq('month', month);

    await supabase
      .from('budgets')
      .delete()
      .eq('user_id', profile.id)
      .eq('category_id', totalExpenseCategoryId)
      .eq('year', year)
      .eq('month', month);

    // Insert new ones if > 0
    const inserts: any[] = [];
    if (budgetedIncome > 0) {
      inserts.push({
        user_id: profile.id,
        category_id: totalIncomeCategoryId,
        year,
        month,
        budgeted_amount: budgetedIncome,
      });
    }
    if (budgetedExpenses > 0) {
      inserts.push({
        user_id: profile.id,
        category_id: totalExpenseCategoryId,
        year,
        month,
        budgeted_amount: budgetedExpenses,
      });
    }

    const { error } = await supabase.from('budgets').insert(inserts);

    if (error) {
      showError('Failed to save budgets.');
    } else {
      showSuccess(`Monthly budgets saved for ${format(currentMonth, 'MMMM yyyy')}!`);
    }
    setSaving(false);
    setShowSaveConfirm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Monthly Budget</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            Previous Month
          </Button>
          <Badge variant="secondary">
            <Calendar className="h-4 w-4 mr-1" />
            {format(currentMonth, 'MMMM yyyy')}
          </Badge>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            Next Month
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Total Budgeted Income
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Expected Income (NPR)</Label>
              <Input
                type="number"
                value={budgetedIncome || ''}
                onChange={(e) => handleIncomeChange(e.target.value)}
                placeholder="e.g., 100000"
                min="0"
                step="0.01"
                className="text-right font-mono text-lg"
              />
              {budgetedIncome > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  {formatCurrency(budgetedIncome)}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Set your total expected income for {format(currentMonth, 'MMMM yyyy')}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              Total Budgeted Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Expected Expenses (NPR)</Label>
              <Input
                type="number"
                value={budgetedExpenses || ''}
                onChange={(e) => handleExpenseChange(e.target.value)}
                placeholder="e.g., 60000"
                min="0"
                step="0.01"
                className="text-right font-mono text-lg"
              />
              {budgetedExpenses > 0 && (
                <p className="text-sm text-red-600 font-medium">
                  {formatCurrency(budgetedExpenses)}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Set your total spending limit for {format(currentMonth, 'MMMM yyyy')}.
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Monthly Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              Income: {formatCurrency(budgetedIncome)}, Expenses: {formatCurrency(budgetedExpenses)} for {format(currentMonth, 'MMMM yyyy')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveBudgets} disabled={saving}>
              {saving ? 'Saving...' : 'Save Budget'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-end">
        <Button onClick={confirmSaveBudgets} disabled={saving || (!totalIncomeCategoryId && !totalExpenseCategoryId)} className="w-full sm:w-auto">
          {saving ? 'Saving...' : 'Save Monthly Budget'}
        </Button>
      </div>
    </div>
  );
};

export default Budgets;